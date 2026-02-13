# Caelith UI Redesign — "Dark Compliance Intelligence"

## 1. Design Philosophy

**Current state:** Classical green + white fintech. Clean but forgettable. Looks like every generic SaaS template from 2022.

**Target state:** Dark-first, data-dense, subtly futuristic. The kind of UI a quant fund CTO would screenshot and share. Think "Bloomberg Terminal meets Linear meets Vercel" — institutional credibility with developer-grade craft.

### Design Pillars
1. **Dark by default** — Light mode as secondary. Every serious data platform has gone dark (Linear, Vercel, Dune, Chainalysis, Terminal)
2. **Information density** — Compliance people need data, not whitespace. More like Bloomberg, less like a landing page
3. **Monospace accents** — Numbers, IDs, hashes, statuses in monospace. Instant "tech" signal
4. **Subtle motion** — Micro-interactions that feel alive without being distracting. Skeleton loaders, not spinners
5. **Glass + glow** — Selective glassmorphism on overlays/modals. Subtle glow on accent elements. Never gratuitous

### Reference Products (Steal From These)

| Product | What to Steal | URL |
|---------|--------------|-----|
| **Linear** | Sidebar design, keyboard shortcuts, dark palette, transition smoothness | linear.app |
| **Vercel Dashboard** | Card layout, deployment status badges, monospace usage, the Geist font | vercel.com/dashboard |
| **Mercury** | Financial data presentation, clean tables, onboarding flows | mercury.com |
| **Stripe Dashboard** | Data visualization, event timeline, the balance of density vs clarity | dashboard.stripe.com |
| **Dune Analytics** | Dark-mode data dashboards, query interfaces, chart styling | dune.com |
| **Ramp** | Expense categorization UI, approval flows, policy cards | ramp.com |
| **Chainalysis** | Compliance-specific UX: risk scores, entity graphs, alert dashboards | chainalysis.com |
| **Raycast** | Command palette, keyboard-first design, blur effects | raycast.com |

### Anti-Patterns to Avoid
- ❌ Neon-on-black "hacker" aesthetic (looks cheap fast)
- ❌ Too much glassmorphism (2021 trend, now stale if overused)
- ❌ Gradient everything (one hero gradient max)
- ❌ Rounded-3xl on everything (2023 trend, going sharper now)
- ❌ White sidebar (dated immediately)

---

## 2. Color Palettes

### Option A: "Midnight Signal" (Recommended)
Dark navy base with electric cyan accents. Professional but unmistakably tech.

```
Background:
  --bg-primary:     #0A0E1A    (deep space navy)
  --bg-secondary:   #111827    (card surfaces)
  --bg-tertiary:    #1A2035    (elevated surfaces, hover)
  --bg-accent:      #0D1525    (sidebar)

Accent (Primary):
  --accent-50:      #ECFEFF
  --accent-100:     #CFFAFE
  --accent-200:     #A5F3FC
  --accent-300:     #67E8F9
  --accent-400:     #22D3EE    ← primary accent
  --accent-500:     #06B6D4
  --accent-600:     #0891B2
  --accent-700:     #0E7490

Success:
  --success:        #34D399    (emerald green — passed checks)

Warning:
  --warning:        #FBBF24    (amber — pending reviews)

Danger:
  --danger:         #F87171    (red — violations, rejections)

Text:
  --text-primary:   #F1F5F9    (main text)
  --text-secondary: #94A3B8    (descriptions, labels)
  --text-tertiary:  #64748B    (timestamps, metadata)
  --text-muted:     #475569    (disabled, placeholders)

Borders:
  --border-subtle:  #1E293B    (card borders)
  --border-default: #334155    (input borders)
  --border-strong:  #475569    (focused elements)
```

**Why this works:** Cyan on dark is instantly "tech" without being neon-gaudy. It's the palette of Bloomberg Terminal, AWS Console, and Datadog. Compliance people trust blue tones. The green stays for semantic "pass/approved" meaning only.

### Option B: "Obsidian Emerald"
Keep the green identity but darken everything. More conservative evolution.

```
Background:
  --bg-primary:     #0C0F0D    (near-black green-tinted)
  --bg-secondary:   #141A16    (cards)
  --bg-tertiary:    #1C2420    (hover, elevated)

Accent:
  --accent-400:     #4ADE80    (keep current green)
  --accent-500:     #22C55E

Text:
  --text-primary:   #E8F0EC
  --text-secondary: #8FA89A
  --text-tertiary:  #5A7367

Borders:
  --border-subtle:  #1E2B23
  --border-default: #2E3E35
```

**Why this works:** Minimal rebrand risk. Existing green stays as primary. Just darken everything else.

### Option C: "Void Violet"
Dark with purple-blue accent. More distinctive, more "AI company" energy.

```
Background:
  --bg-primary:     #09090B    (zinc-950)
  --bg-secondary:   #18181B    (zinc-900)
  --bg-tertiary:    #27272A    (zinc-800)

Accent:
  --accent-400:     #A78BFA    (violet)
  --accent-500:     #8B5CF6

Highlight:
  --highlight:      #38BDF8    (sky blue for secondary)
```

**Why this works:** Unique in fintech space. AI/intelligence vibe. But may feel less "finance-trustworthy."

### 🏆 My Pick: Option A (Midnight Signal)
Cyan is the sweet spot — techy without being gimmicky, institutional without being boring. It also has the strongest contrast and accessibility profile on dark backgrounds.

---

## 3. Typography

### Primary Recommendation: **Inter + JetBrains Mono**

```css
--font-sans: 'Inter', 'system-ui', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Inter** is the Linear/Vercel/Stripe choice for a reason — flawless at small sizes, tabular number support built in, variable weight. It's the "you can't go wrong" pick for data-heavy UIs.

**JetBrains Mono** (already in use!) stays for code, UUIDs, hashes, amounts.

### Alternative: **Geist + Geist Mono** (Vercel's typeface)

```css
--font-sans: 'Geist', 'system-ui', sans-serif;
--font-mono: 'Geist Mono', monospace;
```

Slightly more distinctive. Designed specifically for developer tools. Free. The "if you want to look like you built it in 2026" choice.

### Alternative: **Space Grotesk + IBM Plex Mono**

```css
--font-sans: 'Space Grotesk', sans-serif;
--font-mono: 'IBM Plex Mono', monospace;
```

More geometric, more personality. Space Grotesk is the "techy startup" font of 2025-26. Pairs beautifully with IBM Plex Mono for a data-heavy interface.

### 🏆 My Pick: **Geist + JetBrains Mono**
Geist is newer, sharper, and specifically designed for product UIs. Keep JetBrains Mono for data since it's already wired.

### Type Scale

```
xs:    0.75rem / 12px  — metadata, timestamps, badges
sm:    0.8125rem / 13px — table cells, descriptions
base:  0.875rem / 14px — body text (NOT 16px — dense UIs use 14)
lg:    1rem / 16px     — section headers
xl:    1.25rem / 20px  — page titles
2xl:   1.5rem / 24px   — dashboard hero numbers
```

**Key rule:** Use `font-variant-numeric: tabular-nums` on ALL number displays. Monospace for: amounts, UUIDs, dates, percentages, counts.

---

## 4. Component Design Language

### Cards
```
- Background: bg-secondary (#111827)
- Border: 1px border-subtle (#1E293B)
- Border-radius: 12px (rounded-xl)
- Hover: border transitions to border-default (#334155), subtle translateY(-1px)
- No shadow (dark UIs don't need shadows — borders do the work)
- Inner glow on focus: ring-1 ring-accent-400/20
```

### Tables
```
- Header row: bg-tertiary, uppercase text-xs tracking-wider text-tertiary, monospace
- Rows: bg-secondary, hover bg-tertiary with 150ms transition
- Cell text: text-sm font-mono for numbers/IDs, font-sans for names
- Zebra striping: NO (use hover highlight instead — cleaner on dark)
- Row dividers: border-b border-subtle (very thin)
- Sticky header with backdrop-blur-sm
```

### Badges / Status Pills
```
- Pill shape: rounded-full, px-2.5 py-0.5
- Approved/Active: bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20
- Pending/Review: bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20
- Rejected/Error: bg-red-500/10 text-red-400 ring-1 ring-red-500/20
- Neutral/Info: bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20
- Monospace font for status text
```

### Buttons
```
Primary:   bg-accent-500 text-white hover:bg-accent-400, no shadow
Secondary: bg-transparent border-default text-secondary hover:text-primary hover:border-strong
Danger:    bg-red-500/10 text-red-400 hover:bg-red-500/20
Ghost:     text-secondary hover:text-primary hover:bg-tertiary
```

### Inputs
```
- bg-primary (darker than card)
- border-default, focus:border-accent-400 focus:ring-1 focus:ring-accent-400/30
- text-primary, placeholder-text-muted
- Monospace for ID/hash/amount inputs
```

### Sidebar (Linear-inspired)
```
- Full-height bg-accent-dark (#0D1117)
- Collapsible (icon-only mode at ≤768px, full at ≥1024px)
- Active item: bg-white/[0.06] with left accent border (2px cyan)
- Section labels: text-[10px] uppercase tracking-[0.15em] text-tertiary
- Icons: 18px, stroke-width 1.5 (thinner = more elegant)
- Keyboard shortcut hints next to items (e.g., "⌘1" for Dashboard)
```

### Navigation Header Bar (NEW)
```
- Thin top bar above content area
- Breadcrumbs on left
- Global search (⌘K) center
- Notifications bell + user avatar right
- bg-secondary border-b border-subtle
```

### Modals
```
- Backdrop: bg-black/60 backdrop-blur-sm
- Modal: bg-secondary border border-subtle rounded-2xl
- Subtle top border gradient: border-t-accent-400/30 (the "glow" touch)
```

### Data Visualization
```
- Chart backgrounds: transparent on bg-secondary cards
- Line colors: cyan-400 (primary), emerald-400 (positive), amber-400 (warning)
- Grid lines: border-subtle, dashed
- Tooltip: bg-tertiary border-subtle, monospace values
- Area fills: accent-400/10 gradient to transparent
```

### Skeleton Loaders (replace all spinners)
```
- Pulsing rectangles matching the content layout
- bg-tertiary animate-pulse, rounded
- Shows structure before data arrives — much more professional than a spinner
```

### Micro-Interactions
```
- Page transitions: opacity + translateY(4px) on mount (150ms ease-out)
- Card hover: translateY(-1px) + border-color transition (150ms)
- Badge count changes: scale-105 + opacity flash (200ms)
- Sidebar collapse: width transition (200ms ease)
- Table row click: bg flash to accent-400/5 (100ms)
- Button press: scale-[0.98] (50ms)
- Toast notifications: slide-in from top-right with spring easing
```

---

## 5. Page-by-Page Design Vision

### Dashboard (/)
**Current:** Unknown/basic
**Redesign:** "Command center" — 4-column grid of KPI cards at top (Total AUM, Active Investors, Pending Reviews, Compliance Score), each with sparkline. Below: two-column layout — left: recent activity timeline (monospace timestamps), right: compliance heatmap by jurisdiction. Bottom: quick-action buttons (New Fund, Review Onboarding, Run Compliance Check).

### Fund Structures (/funds)
**Current:** Card grid with basic info
**Redesign:** Table view by default (cards as toggle option). Columns: Name, Legal Form, Domicile, Framework, Status (badge), AUM, Asset Count, Compliance Score (progress ring), Created. Click → slide-out detail panel (not full page nav). Bulk actions toolbar.

### Investors (/investors)
**Current:** Basic list
**Redesign:** Searchable table with filters (jurisdiction, type, status, risk tier). Investor row expandable to show holdings inline. Jurisdiction flags as tiny icons. KYC status badge prominent. Click → investor profile page with timeline of all interactions.

### Holdings (/holdings)
**Current:** Basic list
**Redesign:** Primary view: tree/accordion grouped by fund → asset → holdings. Amounts in monospace with currency symbols. Percentage bars showing allocation. Cap table view toggle with pie chart.

### Onboarding (/onboarding)
**Current:** Basic records
**Redesign:** Kanban board: Applied → Under Review → Approved → Allocated (or Rejected column). Cards show investor name, fund, amount, days-in-stage counter. Drag-and-drop between columns triggers API actions. Status timeline on card detail.

### Transfers (/transfers)
**Current:** Basic list
**Redesign:** Split view: left = transfer list/table, right = simulation panel. "Simulate Transfer" always visible on right. Validation results show inline with rule-by-rule breakdown (green/red indicators). Transfer history as timeline with hash-chain verification indicator.

### Decisions (/decisions)
**Current:** Basic list
**Redesign:** Timeline-first view (like a git log). Each decision shows: hash (monospace, first 8 chars), type, result (approved/rejected badge), actor, timestamp. Click to expand full reasoning, violations, chain verification. Filter by decision type, result, date range.

### Rules (/rules + /rules/builder)
**Current:** Basic list + builder
**Redesign:** Rules page: visual "rule cards" showing condition → threshold → asset scope. Color-coded by rule type. Builder: split-pane — left = natural language input or visual builder, right = live JSON/logic preview. Test panel at bottom with mock investor data.

### Audit Log (/audit)
**Current:** Basic events list
**Redesign:** Full-width table, monospace timestamps, filterable by entity type + event type. Each row shows: timestamp | event type (badge) | entity | actor | details (truncated, expandable). Real-time append animation for new events. SHA-256 hash chain verification status at top.

### Copilot
**Current:** Chat panel
**Redesign:** Slide-in panel from right (not modal). Dark surface with accent glow on border. Message bubbles: user = bg-accent-500/10, assistant = bg-tertiary. Monospace for any regulatory references or rule IDs. Context awareness shown as pills at top ("Viewing: Meridian SIF Alpha").

---

## 6. Implementation Plan

### Phase 1: Foundation (2-3 days) — "Dark Mode + Typography"
Quick wins that transform the entire feel immediately:

1. **Switch to Geist font** (update `globals.css` import + tailwind config)
2. **Dark palette in `tailwind.config.ts`** — replace all color tokens
3. **Update `globals.css`** — dark body, scrollbar, selection colors
4. **Update `ui.tsx`** — Card, Button, Badge, Input, Modal, LoadingSpinner → skeleton
5. **Update `sidebar.tsx`** — new dark palette, thinner icons, active states
6. **Update `auth-provider.tsx`** — dark loading state
7. **Update `login/page.tsx`** — dark split-screen login

### Phase 2: Components (3-4 days) — "Data-Dense Upgrade"
1. **Data tables component** — sortable, filterable, sticky header, monospace numbers
2. **Skeleton loaders** — replace all `<LoadingSpinner />` with content-shaped skeletons
3. **Badge system** — semantic status badges with ring style
4. **Toast notifications** — replace inline alerts with slide-in toasts
5. **Command palette** (⌘K) — global search across funds, investors, rules
6. **Breadcrumb navigation** — top bar with context

### Phase 3: Pages (4-5 days) — "Feature Upgrades"
1. **Dashboard** — KPI cards, sparklines, activity timeline
2. **Onboarding** — Kanban view
3. **Decisions** — Timeline view
4. **Transfers** — Split-pane simulation
5. **Charts** — Recharts/Nivo with dark theme tokens

### Phase 4: Polish (2 days)
1. Page transition animations
2. Keyboard shortcuts
3. Mobile responsive pass
4. Light mode as toggle (CSS variables)
5. Loading/error/empty state consistency pass

**Total estimate: ~12-14 days of focused frontend work**
For a CEO demo, Phase 1 alone transforms the perception. I'd prioritize that.

---

## 7. Tailwind Config Changes (Phase 1 Preview)

```typescript
// New tailwind.config.ts color tokens
colors: {
  bg: {
    primary:   '#0A0E1A',
    secondary: '#111827',
    tertiary:  '#1A2035',
    sidebar:   '#0D1117',
  },
  accent: {
    50:  '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
    700: '#0E7490',
  },
  ink: {
    DEFAULT:     '#F1F5F9',
    secondary:   '#94A3B8',
    tertiary:    '#64748B',
    muted:       '#475569',
  },
  edge: {
    DEFAULT:     '#334155',
    subtle:      '#1E293B',
    strong:      '#475569',
  },
  surface: {
    DEFAULT:     '#111827',
    muted:       '#0A0E1A',
    subtle:      '#1A2035',
  },
  semantic: {
    success:     '#34D399',
    warning:     '#FBBF24',
    danger:      '#F87171',
    info:        '#22D3EE',
  },
}
```

---

## Summary: What Changes Everything

The single biggest visual upgrade: **go dark + switch to Geist + use monospace for data**. This alone takes Caelith from "SaaS template" to "serious compliance intelligence platform." Everything else is refinement on top of that foundation.
