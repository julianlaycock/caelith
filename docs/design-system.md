# Design System — Caelith Landing Page

**Date:** 2026-02-17
**Version:** 1.0

---

## 1. Spacing Tokens

Base unit: `4px`. All spacing derived from this scale.

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `space-1` | 4px | `1` | Tight inline gaps |
| `space-2` | 8px | `2` | Icon-to-text gaps |
| `space-3` | 12px | `3` | Card internal small gaps |
| `space-4` | 16px | `4` | Standard element spacing |
| `space-6` | 24px | `6` | Card padding (mobile) |
| `space-8` | 32px | `8` | Card padding (desktop) |
| `space-10` | 40px | `10` | Section header to content |
| `space-16` | 64px | `16` | Section vertical padding (mobile) |
| `space-24` | 96px | `24` | Section vertical padding (tablet) |
| `space-32` | 128px | `32` | Section vertical padding (desktop) |

### Section Rhythm
- Mobile: `py-16` (64px)
- Tablet: `sm:py-24` (96px)
- Desktop: `md:py-32` (128px)

## 2. Typography Scale

| Role | Size | Weight | Line Height | Tracking | Font |
|------|------|--------|-------------|----------|------|
| `display` | `clamp(2rem, 5vw, 5rem)` | 700 | 1.08 | `-0.02em` | Space Grotesk |
| `h1` | `clamp(1.75rem, 4vw, 3.75rem)` | 700 | 1.08 | `-0.01em` | Space Grotesk |
| `h2` | `clamp(1.5rem, 3vw, 3rem)` | 700 | 1.12 | `-0.01em` | Space Grotesk |
| `h3` | `1.25rem` | 600 | 1.3 | `0` | Space Grotesk |
| `body` | `0.875rem` | 400 | 1.6 | `0` | Space Grotesk |
| `small` | `0.8125rem` | 400 | 1.5 | `0` | Space Grotesk |
| `caption` | `0.6875rem` | 500 | 1.2 | `0.15em` | JetBrains Mono |
| `label` | `0.6875rem` | 600 | 1.0 | `0.2em` | JetBrains Mono |

### Serif Accent
- Font: Instrument Serif (italic only)
- Used in: hero accent words, section headline accents
- Never used for body text

## 3. Color Tokens (Landing-Specific)

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#F5F2EA` | Page background |
| `surface-elevated` | `white/50` | Card backgrounds |
| `ink-primary` | `#080D14` (accent-950) | Headlines, nav |
| `ink-secondary` | `accent-950/55` | Body text |
| `ink-muted` | `accent-950/35` | Captions, labels |
| `gold` | `#D8BA8E` | Accent, CTAs, tags |
| `gold-hover` | `#c9a878` | Button hover state |
| `gold-subtle` | `#D8BA8E/20` | Borders, backgrounds |
| `edge` | `#c6beb1/15` | Card borders |
| `dark-bg` | `accent-950` | Dark sections |
| `dark-text` | `white/70` | Text on dark |
| `dark-muted` | `white/30` | Muted text on dark |

## 4. Radii

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | `0.5rem` (8px) | Small buttons, badges |
| `radius-md` | `0.75rem` (12px) | Inputs, small cards |
| `radius-lg` | `1rem` (16px) | Cards, panels |
| `radius-xl` | `1.5rem` (24px) | Hero elements |
| `radius-full` | `9999px` | Pill buttons, badges |

## 5. Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-subtle` | `0 1px 3px rgba(45,39,34,0.03)` | Nav scrolled |
| `shadow-card` | `0 1px 2px rgba(45,39,34,0.04), 0 4px 12px rgba(45,39,34,0.03)` | Cards |
| `shadow-elevated` | `0 4px 24px rgba(8,13,20,0.12)` | Code blocks on dark |
| `shadow-gold` | `0 8px 24px rgba(216,186,142,0.15)` | Gold CTA hover |

## 6. Motion Tokens

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `motion-fast` | `150ms` | `ease-out` | Hover states, toggles |
| `motion-normal` | `300ms` | `ease-out` | Nav transitions, focus |
| `motion-slow` | `500ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Page transitions |
| `motion-reveal` | `700ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Scroll reveal |

### Reduced Motion
All motion respects `prefers-reduced-motion: reduce`:
- Reveals: instant opacity, no transform
- Counters: instant final value
- Parallax: disabled
- Hover transforms: disabled

## 7. Component Specifications

### LandingButton
```
Props: variant ('primary' | 'secondary' | 'ghost'), size ('sm' | 'md' | 'lg'), children, onClick, href
Primary: bg-gold, text-accent-900, rounded-full, hover:bg-gold-hover, focus-visible ring
Secondary: border border-edge, text-ink, rounded-full, hover:bg-accent-950/5
Ghost: text-ink-muted, hover:text-ink
Sizes: sm (px-5 py-2 text-sm), md (px-8 py-3 text-sm), lg (px-10 py-4 text-sm)
```

### LandingSection
```
Props: id?, children, dark?, className?
Wrapper: <section> with id, py-16 sm:py-24 md:py-32 px-6
Inner: max-w-6xl mx-auto
Dark: bg-accent-950, text-white
```

### WorkflowCard
```
Props: title, role, jurisdiction, output, status ('live' | 'pilot')
Grid view: card with all fields visible
List view: single row with fields inline
Status badge: live = emerald, pilot = gold
```

### GridListToggle
```
Props: view ('grid' | 'list'), onChange
Persists to localStorage key 'caelith_workflow_view'
Two icon buttons, active state highlighted
Accessible: role="radiogroup", aria-label
```
