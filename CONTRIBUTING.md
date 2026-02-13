# WORKING_RULES.md

## Working Rules & Conventions

### Git Workflow
- Branch: `main` (stable), `dev` (integration)
- Commits: Conventional commits format
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code restructure
  - `test:` test additions
  - `docs:` documentation

### Code Standards

#### TypeScript
- Strict mode enabled
- Explicit return types on functions
- Interface over type for object shapes
- No `any` types
- Prefer `const` over `let`

#### Naming Conventions
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (no `I` prefix)
- Types: `PascalCase`

#### File Organization
```
src/backend/
  models/        # TypeScript interfaces/types
  repositories/  # Database access
  services/      # Business logic
  routes/        # Express routes
  middleware/    # Express middleware
  utils/         # Helpers

src/rules-engine/
  types.ts       # Rule interfaces
  validator.ts   # Validation logic
  validator.test.ts

src/frontend/
  pages/         # Page components
  components/    # Reusable components
  hooks/         # Custom React hooks
  api/           # API client
```

### Database Conventions
- Table names: plural, snake_case (`investors`, `rule_sets`)
- Column names: snake_case
- Primary keys: `id` (UUID)
- Foreign keys: `{table}_id`
- Timestamps: `created_at`, `updated_at`
- Use migrations for schema changes
- Never delete data (soft delete if needed)

### API Conventions
- RESTful routes
- JSON payloads
- ISO 8601 timestamps
- Consistent error format:
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable",
  "details": {}
}
```

### Testing Standards
- Test files: `*.test.ts`
- Unit tests: Pure logic, no DB
- Integration tests: Full request/response cycle
- Test data: Fixtures in `tests/fixtures/`
- Minimum coverage: 80%

### Error Handling
- Use custom error classes
- Log all errors
- Never expose stack traces to client
- Return appropriate HTTP status codes

### Documentation Standards
- README: Setup + quick start
- Code comments: Why, not what
- JSDoc: Public functions/classes
- Keep docs/ in sync with code
- Update ARCHITECTURE.md on design changes

### Review Checklist (Self-Review)
- [ ] TypeScript strict checks pass
- [ ] Tests written and passing
- [ ] No console.log statements
- [ ] Error handling complete
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] Follows naming conventions

### Scope Management
⚠️ **When scope grows:**
1. Stop work
2. Document new requirement
3. Assess impact on timeline
4. Get approval before continuing

### Decision Log
Capture architectural decisions:
```
## Decision: [Title]
Date: YYYY-MM-DD
Context: [Why this decision needed]
Decision: [What we chose]
Consequences: [Tradeoffs]
```