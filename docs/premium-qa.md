# QA Checklist — Caelith Landing Page Premium Upgrade

**Date:** 2026-02-17
**Scope:** /login page (Variant 1 + Variant 2)

---

## 1. Visual Regression

| Check | V1 | V2 | Notes |
|-------|----|----|-------|
| Hero renders correctly at 1440px | [ ] | [ ] | Check headline, CTA, mock dashboard (V1) or text-only (V2) |
| Hero renders correctly at 375px | [ ] | [ ] | No horizontal overflow, text readable |
| Nav transitions on scroll (transparent → solid) | [ ] | [ ] | Both variants share LandingNav |
| Mobile menu opens/closes | [ ] | [ ] | ARIA states toggle correctly |
| Countdown badge displays correctly | [ ] | [ ] | V1: badge. V2: inline text |
| Trust strip icons aligned | [ ] | [ ] | V1: dark bg. V2: light bg |
| Workflow module grid view | [ ] | [ ] | Cards align in 2-col (sm) and 3-col (lg) |
| Workflow module list view | [ ] | [ ] | Rows stack correctly on mobile |
| Grid/List toggle persists across reload | [ ] | [ ] | localStorage key: `caelith_workflow_view` |
| Status badges: live (emerald), pilot (gold) | [ ] | [ ] | Color correctness |
| Problem cards (V1 only) | [ ] | N/A | 3-column on desktop, stacked on mobile |
| Solution metrics counter animation (V1 only) | [ ] | N/A | Triggers on scroll into view |
| Feature sections alternating layout (V1 only) | [ ] | N/A | Even: left text. Odd: right text |
| Code blocks render (V1 only) | [ ] | N/A | Rule DSL, hash chain, regulation grid |
| Pricing cards: highlighted tier elevated | [ ] | [ ] | Professional card has glow border + lift |
| CTA section parallax (V1 only) | [ ] | N/A | Subtle vertical shift on scroll |
| Sign-in form centered, fields functional | [ ] | [ ] | All inputs work, error displays |
| Legal disclaimer visible | [ ] | [ ] | Light bg bar above footer |
| Footer grid layout | [ ] | [ ] | 4 columns on desktop, stacked on mobile |

## 2. Keyboard & Focus

| Check | V1 | V2 | Notes |
|-------|----|----|-------|
| Skip link appears on Tab from top | [ ] | [ ] | Visible on focus, jumps to #main-content |
| All nav links focusable via Tab | [ ] | [ ] | focus-visible ring appears |
| Mobile menu toggle has focus ring | [ ] | [ ] | aria-expanded toggles |
| Grid/List toggle keyboard operable | [ ] | [ ] | role="radiogroup", Enter/Space switches |
| Sign-in form Tab order: email → password → remember → help → submit | [ ] | [ ] | Logical order |
| Error message has role="alert" | [ ] | [ ] | Screen reader announces on appear |
| CTA buttons reachable via keyboard | [ ] | [ ] | focus-visible rings visible |
| Pricing CTA buttons focusable | [ ] | [ ] | All 3 tiers |
| Footer links focusable | [ ] | [ ] | Product, Company links |

## 3. Reduced Motion

| Check | V1 | V2 | Notes |
|-------|----|----|-------|
| Reveal animations: instant opacity, no transform | [ ] | [ ] | CSS `prefers-reduced-motion: reduce` |
| Counter animation: instant final value | [ ] | N/A | useAnimatedCounter checks media query |
| Parallax disabled | [ ] | N/A | JS checks once on mount |
| Bar chart animation still works (CSS) | [ ] | N/A | Acceptable: CSS animation |
| No jarring motion throughout page | [ ] | [ ] | Manual review |

## 4. Lighthouse (Target: 90+ all categories)

| Metric | V1 Target | V2 Target | Notes |
|--------|-----------|-----------|-------|
| Performance | 90+ | 90+ | Largest Contentful Paint < 2.5s |
| Accessibility | 95+ | 95+ | ARIA, alt text, contrast |
| Best Practices | 90+ | 90+ | HTTPS, no console errors |
| SEO | 90+ | 90+ | Meta tags, semantic HTML |

### Performance sub-checks
- [ ] Unsplash images: add `loading="lazy"` on below-fold images
- [ ] Hero image: consider preloading or using next/image (TODO)
- [ ] Google Fonts: font-display: swap in stylesheet
- [ ] No layout shift from countdown badge
- [ ] No layout shift from workflow grid/list toggle

## 5. Cross-Browser

| Browser | V1 | V2 | Notes |
|---------|----|----|-------|
| Chrome 120+ (desktop) | [ ] | [ ] | Primary target |
| Firefox 120+ (desktop) | [ ] | [ ] | Check backdrop-blur |
| Safari 17+ (desktop) | [ ] | [ ] | Check 100svh support |
| Chrome (Android) | [ ] | [ ] | Touch targets 44px+ |
| Safari (iOS 17+) | [ ] | [ ] | 100svh, position:fixed nav |
| Edge 120+ | [ ] | [ ] | Chromium-based, likely matches Chrome |

## 6. Functional

| Check | V1 | V2 | Notes |
|-------|----|----|-------|
| Sign-in submits correctly with valid credentials | [ ] | [ ] | Redirects to / |
| Sign-in shows error with invalid credentials | [ ] | [ ] | Error banner with role="alert" |
| Remember-me persists email across sessions | [ ] | [ ] | localStorage key: `caelith_remember` |
| Remember-me unchecked clears stored email | [ ] | [ ] | |
| Feature flag: /login loads Variant 1 | [ ] | N/A | Default behavior |
| Feature flag: /login?variant=2 loads Variant 2 | N/A | [ ] | URL param switch |
| Smooth scroll navigation works | [ ] | [ ] | All nav links, CTA buttons |
| Section IDs stable: features, how-it-works, pricing, signin | [ ] | [ ] | Deep links work |
| Pricing CTA opens mailto with correct subject | [ ] | [ ] | Per-tier subject line |
| "Need help?" opens mailto | [ ] | [ ] | Password reset subject |
| "Request access" opens mailto | [ ] | [ ] | Access request subject |

## 7. Responsive Breakpoints

| Breakpoint | V1 | V2 | Key checks |
|------------|----|----|------------|
| 320px | [ ] | [ ] | No overflow, text readable, countdown wraps |
| 375px | [ ] | [ ] | Standard mobile, single column |
| 768px (sm) | [ ] | [ ] | 2-column grids activate |
| 1024px (md) | [ ] | [ ] | Desktop nav visible, mobile menu hidden |
| 1280px (lg) | [ ] | [ ] | Full 3-column layouts |
| 1440px | [ ] | [ ] | Max-width container centered |

## 8. Content & Legal

| Check | Status | Notes |
|-------|--------|-------|
| No "prove you're compliant" | [ ] | Forbidden wording |
| No "tamper-proof" (use "tamper-evident") | [ ] | Forbidden wording |
| No "cryptographically signed" | [ ] | Forbidden wording |
| No "full coverage" | [ ] | Forbidden wording |
| No "0 manual steps" | [ ] | Forbidden wording |
| No "SLA guarantee" | [ ] | Forbidden wording |
| No fabricated clients/awards/testimonials | [ ] | |
| Pricing shows "exclusive of VAT" | [ ] | |
| Legal disclaimer present and accurate | [ ] | |
| "Human-in-the-Loop" language present | [ ] | Trust strip |
| "AI outputs require verification" present | [ ] | Legal disclaimer |
