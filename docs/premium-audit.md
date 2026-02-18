# Premium Landing Page Audit — Caelith `/login`

**Date:** 2026-02-17
**Auditor:** CPO / Product Design Lead
**File:** `src/frontend/src/app/login/page.tsx` (823 lines)

---

## 1. Typography Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| No formal type scale | High | Sizes are ad-hoc (`text-[11px]`, `text-[10px]`, `text-[13px]`). No H1/H2/H3/body/small/label contract. |
| Serif font not in tailwind config | Medium | `font-serif` relies on globals.css `:root` var but not in `tailwind.config.ts` fontFamily. |
| Inconsistent label sizes | Medium | Nav uses `text-[13px]`, countdown uses `text-[10px]`, section tags use `text-[11px]` — no unifying scale. |
| Missing `font-display: swap` | Low | Google Fonts import in globals.css uses `display=swap` (correct), but no local fallback metrics defined. |

## 2. Spacing Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Inconsistent section padding | High | Sections use `py-16 sm:py-28 md:py-40` but some use `py-16 md:py-20`, `py-16 px-6`. No spacing rhythm. |
| No spacing tokens | High | All spacing is inline Tailwind — no shared constants for section gaps, card padding, element gaps. |
| Double blank lines in JSX | Low | Cosmetic artifact from SectionDivider removal — 5 locations with double blank lines. |

## 3. Hierarchy Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Hero is 3 lines long | Medium | "The compliance engine / built for auditable / decisions" — exceeds 1-headline + 1-subline target. |
| Section headers all same pattern | Medium | Every section opens with `text-[11px] font-mono gold tag + text-6xl heading`. Monotonous rhythm. |
| No "Compliance Workflows" framing | High | Missing product proof module showing actual workflows with role/jurisdiction/output context. |
| Social proof weak | Medium | Only industry stats + PwC quote. No product metrics tied to actual capability. |

## 4. Motion Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| No motion token system | High | Durations/easings are inline (`transition-all`, `duration-300`, `duration-500`). No shared constants. |
| Parallax on scroll | Medium | Hero + solution images use JS-driven `translateY(scrollY * 0.3)`. No `will-change` on parent, no reduced-motion respect. |
| `animate-pulse` on badge | Low | Pulsing dot in countdown badge is distracting for an otherwise calm page. |
| Reveal `transitionDelay` inline | Low | RevealDiv uses inline style delay — could be CSS custom property for cleanliness. |

## 5. Performance Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Unsplash images not optimized | High | 3 full-bleed images loaded via `<img src>` — no `next/image`, no responsive srcset, no blur placeholder. Hero image is render-blocking for LCP. |
| Google Fonts in CSS @import | Medium | Loaded via `@import url()` in globals.css — render-blocking. Should use `<link rel="preconnect">` + `<link rel="preload">`. |
| 823 lines in single file | Medium | All data, hooks, components, and layout in one file. No code-splitting opportunity. |
| No lazy-loading for below-fold | Medium | Solution and CTA background images have `loading="lazy"` (good), but hero parallax image does not. |

## 6. Accessibility Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Heading hierarchy | Medium | H1 in hero, then H2 in each section, but feature blocks use H3 inside RevealDiv — structure is correct but not validated. |
| Mobile menu lacks ARIA | High | Hamburger toggle has no `aria-expanded`, `aria-controls`, or `aria-label`. Menu panel has no `role="dialog"` or focus trap. |
| No skip-to-content link | Medium | Long page with no skip link for keyboard users. |
| Focus not visible on all buttons | Medium | Custom buttons use `transition-all` but no explicit `focus-visible` ring. |
| Parallax scroll not `prefers-reduced-motion` aware | Medium | JS parallax runs regardless of motion preference. |

## 7. Mobile-Specific Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Hero image overflows | High | `h-[120%]` on parallax image causes extra scrollable area on some mobile browsers. |
| Countdown badge overflows at 320px | Medium | Inline-flex countdown wraps awkwardly on very narrow screens. |
| Dashboard mock too detailed for mobile | Medium | 4-column stat grid + bar chart + pass/fail table is cramped on 375px screens. |
| Footer 2-col at all mobile sizes | Low | Grid is `grid-cols-2 md:grid-cols-4` — 2 cols at 320px is tight for text content. |
| Touch targets < 44px | Medium | Nav links and footer links are `text-xs` buttons with no min-height padding. |

---

## 8. Proposed Information Architecture

### Variant 1: Proof-First Compliance Landing
```
Nav (fixed)
Hero (sharp headline + 1 subline + countdown badge + CTA pair)
Trust Strip (4 infrastructure credentials, horizontal)
Compliance Workflows (grid/list toggle, 6 workflow cards with role/jurisdiction/output/status)
Solution Metrics (4 animated counters on dark band)
Features (3 alternating blocks with code/data visualizations)
How It Works (3-step process)
Pricing (3-tier cards)
CTA (deadline urgency + CTA pair)
Sign In (form)
Legal Disclaimer
Footer
```

### Variant 2: Minimal Confidence Landing
```
Nav (fixed)
Hero (calmer — single line headline + supporting text + single CTA)
Compliance Workflows (workflow-first, list view default, 6 cards)
Trust Strip (4 credentials, subtle)
Pricing (3-tier cards)
Sign In (form)
Legal Disclaimer
Footer
```

## 9. Component Inventory

| Component | Status | Notes |
|-----------|--------|-------|
| `LandingButton` | New | Primary/secondary/ghost variants, consistent padding, focus ring |
| `LandingSection` | New | Wrapper with token-based vertical spacing, max-width, ID prop |
| `SectionHeader` | New | Tag + headline + optional description, consistent pattern |
| `TrustStrip` | New | Horizontal strip of 4 credential items |
| `WorkflowCard` | New | Title, role, jurisdiction, output, status badge |
| `GridListToggle` | New | Icon toggle with localStorage persistence |
| `WorkflowModule` | New | Grid/list layout + toggle + card collection |
| `MetricCounter` | Exists | `useAnimatedCounter` — extract into reusable component |
| `CountdownBadge` | Refactor | Extract from hero inline code |
| `DashboardMock` | Refactor | Extract from hero inline code |
| `PricingCard` | Refactor | Extract from pricing section inline code |
| `SignInForm` | Extract | Move to shared component, receives handlers as props |
| `LandingNav` | Extract | Nav + mobile menu, receives scrollTo + state |
| `LandingFooter` | Extract | Footer with scroll-to links |
