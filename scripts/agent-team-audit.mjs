#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const task = args.join(" ").trim() || "High-value quality audit";
const generatedAt = new Date().toISOString();

function listFilesRecursive(dir, allowExt = [".ts", ".tsx", ".js", ".mjs", ".sql", ".yml", ".yaml", ".md"]) {
  const out = [];
  if (!safeExists(dir)) return out;

  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listFilesRecursive(full, allowExt));
      continue;
    }
    const ext = path.extname(full).toLowerCase();
    if (allowExt.includes(ext)) out.push(full.replace(/\\/g, "/"));
  }
  return out;
}

function safeExists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function scanMatches(files, regex) {
  const matches = [];
  for (const file of files) {
    const text = readText(file);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (regex.test(lines[i])) {
        matches.push({
          file,
          line: i + 1,
          text: lines[i].trim()
        });
      }
      regex.lastIndex = 0;
    }
  }
  return matches;
}

function uniq(items) {
  return [...new Set(items)];
}

function takeFileRefs(matches, limit = 4) {
  return uniq(matches.map((m) => m.file)).slice(0, limit);
}

function severityScore(severity) {
  if (severity === "Critical") return 4;
  if (severity === "High") return 3;
  if (severity === "Medium") return 2;
  return 1;
}

function toRel(file) {
  return file.replace(/\\/g, "/");
}

const backendFiles = listFilesRecursive("src/backend");
const repoFiles = listFilesRecursive("src/backend/repositories");
const testFiles = [
  ...listFilesRecursive("tests"),
  ...listFilesRecursive("src/rules-engine"),
  ...listFilesRecursive("src/backend")
];
const migrationFiles = listFilesRecursive("migrations");

const serverPath = "src/backend/server.ts";
const dbPath = "src/backend/db.ts";
const securityPath = "src/backend/middleware/security.ts";

const serverText = readText(serverPath);
const dbText = readText(dbPath);
const securityText = readText(securityPath);

const routeUseMatches = [...serverText.matchAll(/app\.use\('([^']+)',\s*([^\n;]+)\);/g)];
const apiMounts = routeUseMatches.filter((m) => m[1].startsWith("/api"));
const protectedMounts = apiMounts.filter((m) => m[2].includes("authenticate"));
const publicMounts = apiMounts.filter((m) => !m[2].includes("authenticate"));
const allowedPublicMounts = new Set(["/api", "/api/auth", "/api/docs"]);
const unexpectedPublicMounts = publicMounts
  .map((m) => m[1])
  .filter((p) => !allowedPublicMounts.has(p));

const defaultTenantMatches = scanMatches(
  [...repoFiles, ...listFilesRecursive("src/backend/routes"), ...listFilesRecursive("src/backend/services")],
  /DEFAULT_TENANT_ID/
);
const tenantHelperMatches = scanMatches(repoFiles, /queryWithTenant|executeWithTenant/);
const tenantBindingMatches = scanMatches(backendFiles, /set_config\(|SET\s+app\.tenant_id|app\.tenant_id/);
const rlsMigrationMatches = scanMatches(migrationFiles, /ENABLE ROW LEVEL SECURITY|CREATE POLICY|tenant_isolation|app\.tenant_id/);

const rulesSignalMatches = scanMatches(testFiles, /describe\(|it\(|test\(/);
const tenantTestMatches = scanMatches(testFiles, /tenant|RLS|row level|cross-tenant|app\.tenant_id/i);
const authzTestMatches = scanMatches(testFiles, /401|403|UNAUTHORIZED|FORBIDDEN|authorize|authenticate/);
const integrityMatches = scanMatches(
  [...listFilesRecursive("src/backend/routes"), ...testFiles],
  /seal-all|integrity|hash/i
);
const rateLimitTestMatches = scanMatches(testFiles, /RATE_LIMIT_EXCEEDED|X-RateLimit|Retry-After|rate limit/i);
const corsTestMatches = scanMatches(testFiles, /CORS|Origin|origin not allowed/i);
const resetGuardTestMatches = scanMatches(testFiles, /reset not available in production|\/reset|RESET_FAILED/i);

const risks = [];

if (tenantBindingMatches.length === 0) {
  risks.push({
    severity: "Critical",
    title: "No explicit runtime binding of app.tenant_id detected",
    evidence: [
      "No runtime matches for set_config/SET app.tenant_id in backend code.",
      `RLS-related migration signals found: ${rlsMigrationMatches.length}.`
    ],
    files: [dbPath, serverPath, "migrations/020_fix_rls_policies.sql"],
    mitigation:
      "Set tenant context at DB boundary per request/transaction and fail closed when tenant context is missing.",
    testGap:
      "Add e2e cross-tenant isolation tests (tenant A must never read tenant B data)."
  });
}

if (defaultTenantMatches.length >= 10) {
  risks.push({
    severity: "High",
    title: "Widespread DEFAULT_TENANT_ID fallback usage in runtime paths",
    evidence: [`${defaultTenantMatches.length} references found in repositories/routes/services.`],
    files: takeFileRefs(defaultTenantMatches, 5),
    mitigation:
      "Propagate req.user.tenantId through service/repository boundaries and avoid fallback in request-time logic.",
    testGap:
      "Add tests enforcing explicit tenant context for reads and writes."
  });
}

if (tenantTestMatches.length === 0) {
  risks.push({
    severity: "High",
    title: "No tenant-isolation or RLS tests detected",
    evidence: ["No tenant/RLS keywords found in tests."],
    files: ["tests/e2e", "tests/unit", "src/rules-engine"],
    mitigation:
      "Add cross-tenant denial tests for assets, investors, transfers, onboarding, and decisions.",
    testGap:
      "Build a multi-tenant fixture and assert strict isolation at API and DB layers."
  });
}

if (authzTestMatches.length < 8) {
  risks.push({
    severity: "High",
    title: "Limited authz-denial test signal",
    evidence: [`Auth/authz denial signal matches: ${authzTestMatches.length}.`],
    files: ["tests/e2e", "src/backend/middleware/auth.ts", "src/backend/server.ts"],
    mitigation:
      "Add explicit 401/403 tests for protected and role-gated routes.",
    testGap:
      "Role matrix tests for admin, compliance_officer, investor, unauthenticated."
  });
}

if (unexpectedPublicMounts.length > 0) {
  risks.push({
    severity: "High",
    title: "Unexpected public API mounts detected",
    evidence: [`Public mounts without authenticate: ${unexpectedPublicMounts.join(", ")}.`],
    files: [serverPath],
    mitigation:
      "Add authenticate middleware or document intentional public exposure with explicit tests.",
    testGap:
      "Add unauthorized tests for each public mount not intended for anonymous access."
  });
}

if (securityText.includes("new Map<string, RateLimitEntry>()")) {
  risks.push({
    severity: "Medium",
    title: "Rate limiter is in-memory and per-instance",
    evidence: [
      "Rate limit state uses process-local Map.",
      "Counters reset on restart and do not coordinate across nodes."
    ],
    files: [securityPath],
    mitigation:
      "Use shared store-backed limiter (Redis or DB) in production deployments.",
    testGap:
      "Add multi-instance rate-limit consistency test."
  });
}

if (serverText.includes("ADMIN_PASSWORD || 'admin1234'")) {
  risks.push({
    severity: "Medium",
    title: "Default admin password fallback exists in runtime startup path",
    evidence: ["Fallback credential string present in startup logic."],
    files: [serverPath],
    mitigation:
      "Require explicit dev flag for fallback credentials and disable by default.",
    testGap:
      "Add startup config tests for production and local-dev modes."
  });
}

if (integrityMatches.length < 3) {
  risks.push({
    severity: "Medium",
    title: "Limited test signal for decision integrity and seal verification",
    evidence: [`Integrity/seal matches across code+tests: ${integrityMatches.length}.`],
    files: ["src/backend/routes/decision-record-routes.ts", "tests/e2e/audit-trail.test.ts"],
    mitigation:
      "Add tamper-detection and periodic integrity sweep tests.",
    testGap:
      "Add negative test mutating persisted decision snapshot and assert verification failure."
  });
}

if (tenantHelperMatches.length < repoFiles.length) {
  risks.push({
    severity: "Medium",
    title: "Tenant helper usage is not dominant across repository layer",
    evidence: [
      `Tenant helper references: ${tenantHelperMatches.length}.`,
      `Repository files: ${repoFiles.length}.`
    ],
    files: ["src/backend/repositories", dbPath],
    mitigation:
      "Standardize repository access through tenant-safe helper functions and enforce by lint or test check.",
    testGap:
      "Add static check failing PRs with unscoped tenant-table queries."
  });
}

if (rlsMigrationMatches.length > 0 && tenantBindingMatches.length === 0) {
  risks.push({
    severity: "Medium",
    title: "RLS hardening exists in migrations but runtime enforcement path is unclear",
    evidence: [
      `RLS migration signal matches: ${rlsMigrationMatches.length}.`,
      "No runtime tenant session binding signals detected."
    ],
    files: ["migrations/019_security_hardening.sql", "migrations/020_fix_rls_policies.sql", dbPath],
    mitigation:
      "Add startup/runtime assertion that tenant context binding is active for tenant-scoped requests.",
    testGap:
      "Add DB-level test verifying no rows returned when app.tenant_id is missing."
  });
}

if (serverText.includes("app.post('/api/reset'")) {
  risks.push({
    severity: "Medium",
    title: "Destructive /api/reset endpoint exists in runtime API surface",
    evidence: [
      "Reset route is present in server runtime code and performs broad table deletes.",
      `Reset-related test signals: ${resetGuardTestMatches.length}.`
    ],
    files: [serverPath, "tests/fixtures/api-helper.ts"],
    mitigation:
      "Keep endpoint test-only behind strict environment and auth gates; consider separate test bootstrap path not deployed to production builds.",
    testGap:
      "Add explicit test verifying /api/reset is always blocked when NODE_ENV=production."
  });
}

if (rateLimitTestMatches.length === 0) {
  risks.push({
    severity: "Medium",
    title: "No automated tests for rate-limit enforcement behavior",
    evidence: ["No rate-limit headers/error patterns detected in tests."],
    files: [securityPath, "tests/e2e"],
    mitigation:
      "Add e2e tests for throttling behavior, response headers, and retry-after semantics.",
    testGap:
      "Test both auth and general API limiters with deterministic request bursts."
  });
}

if (corsTestMatches.length === 0) {
  risks.push({
    severity: "Medium",
    title: "No test coverage for CORS allow/deny behavior",
    evidence: ["No CORS/origin test signals detected."],
    files: [serverPath, "src/backend/middleware/security.ts", "tests/e2e"],
    mitigation:
      "Add integration tests that validate allowed origins succeed and blocked origins fail predictably.",
    testGap:
      "Include preflight OPTIONS and credentialed request scenarios."
  });
}

while (risks.length < 10) {
  risks.push({
    severity: "Low",
    title: "Remaining hardening slot",
    evidence: ["No additional deterministic signal crossed the risk threshold in this run."],
    files: ["docs/ARCHITECTURE.md"],
    mitigation: "Expand audit heuristics or add threat-model derived checks.",
    testGap: "Introduce tests aligned to newly identified threat scenarios."
  });
}

const topRisks = risks
  .sort((a, b) => severityScore(b.severity) - severityScore(a.severity))
  .slice(0, 10);

const teammateOutput = [
  "UX Teammate",
  "- Assumptions: Engineers need concise, actionable outputs they can execute immediately.",
  "- Confidence: Medium.",
  "- Findings:",
  "  - Keep severity-ordered output with file-level evidence and immediate next actions.",
  "  - Emit deterministic sections to make audit diffs reviewable in PRs.",
  "  - Keep command surface simple: one run command for full report.",
  "",
  "Technical Architecture Teammate",
  "- Assumptions: Express + PostgreSQL architecture with tenant boundaries and RLS migration controls.",
  "- Confidence: Medium-High.",
  "- Findings:",
  `  - API mounts detected: ${apiMounts.length} (protected: ${protectedMounts.length}, public: ${publicMounts.length}).`,
  `  - DEFAULT_TENANT_ID runtime references: ${defaultTenantMatches.length}.`,
  `  - Tenant-helper references in repositories: ${tenantHelperMatches.length}.`,
  `  - Runtime tenant-session binding signals: ${tenantBindingMatches.length}.`,
  "",
  "Testing Teammate",
  "- Assumptions: Domain behavior tests exist; security/tenant isolation tests are currently the biggest gap.",
  "- Confidence: High.",
  "- Findings:",
  `  - Test files detected: ${testFiles.length}.`,
  `  - Rules/flow test signals: ${rulesSignalMatches.length}.`,
  `  - Tenant/RLS test signals: ${tenantTestMatches.length}.`,
  `  - Authz-denial test signals: ${authzTestMatches.length}.`,
  "  - Highest-value additions: cross-tenant denial e2e, role matrix e2e, integrity tamper tests.",
  "",
  "Devil's Advocate Teammate",
  "- Assumptions: Team wants high-impact improvements with minimal architecture churn.",
  "- Confidence: Medium.",
  "- Findings:",
  "  - If tenant context is not bound at runtime, RLS can be misconfigured or bypassed unintentionally.",
  "  - DEFAULT_TENANT_ID fallback can mask missing tenant propagation in code paths.",
  "  - In-memory rate limiting is acceptable only for local/single-instance deployments.",
  "",
  "Decision Synthesis",
  "- Recommendation: enforce tenant context at DB boundary first, then expand tenant/authz/integrity tests, then harden operational controls.",
  "- Reasoning: this sequence reduces breach risk fastest and prevents regressions as hardening proceeds.",
  ""
];

const backlog = [
  {
    priority: "P0",
    title: "Bind tenant context at DB boundary",
    acceptance:
      "Every tenant-scoped request sets tenant context and fails closed if missing.",
    metric:
      "Cross-tenant e2e suite passes with 0 leakage cases."
  },
  {
    priority: "P0",
    title: "Remove request-time DEFAULT_TENANT_ID fallback",
    acceptance:
      "Repositories/services require explicit tenantId for tenant-scoped operations.",
    metric:
      "Runtime DEFAULT_TENANT_ID references reduced by at least 70 percent."
  },
  {
    priority: "P0",
    title: "Add tenant isolation and role-boundary e2e matrix",
    acceptance:
      "Core endpoints return 401/403 appropriately and deny cross-tenant access.",
    metric:
      "At least 20 new high-value security assertions green in CI."
  },
  {
    priority: "P1",
    title: "Add decision-record integrity tamper tests",
    acceptance:
      "Tampered snapshots are detected and reported with deterministic error paths.",
    metric:
      "Integrity negative-path tests pass without false positives."
  },
  {
    priority: "P1",
    title: "Harden production rate limiter",
    acceptance:
      "Rate-limit behavior is consistent across at least two application instances.",
    metric:
      "Load test confirms stable throttle behavior across nodes."
  }
];

const riskLines = topRisks.map((risk, idx) => {
  const files = risk.files.map((f) => `\`${toRel(f)}\``).join(", ");
  return [
    `${idx + 1}. [${risk.severity}] ${risk.title}`,
    `   - Evidence: ${risk.evidence.join(" ")}`,
    `   - Files: ${files}`,
    `   - Mitigation: ${risk.mitigation}`,
    `   - Missing test: ${risk.testGap}`
  ].join("\n");
});

const backlogLines = backlog.map((item, idx) =>
  [
    `${idx + 1}. ${item.priority} - ${item.title}`,
    `   - Acceptance: ${item.acceptance}`,
    `   - Success metric: ${item.metric}`
  ].join("\n")
);

const report = [
  "Agent Team Audit Report",
  `Generated: ${generatedAt}`,
  `Task: ${task}`,
  "",
  ...teammateOutput,
  "Top 10 Risks (Severity-Ordered)",
  ...riskLines,
  "",
  "Execution Backlog (2 Weeks, MVP-First)",
  ...backlogLines,
  "",
  "Quick Commands",
  "- Re-run audit: `npm run agent:audit -- \"<task>\"`",
  "- Inspect tenant scope references: `rg -n \"DEFAULT_TENANT_ID|tenant_id|queryWithTenant|executeWithTenant\" src/backend -S`",
  "- Inspect authz denial tests: `rg -n \"401|403|UNAUTHORIZED|FORBIDDEN\" tests -S`"
].join("\n");

console.log(report);
