# EventBox — Design System (MASTER)

> Source of truth for UI decisions. Documents the **in-code** system (tokens live in `src/app/globals.css`).
> When building a page, check `design-system/pages/<page>.md` first; if absent, follow this file.

**Product:** EventBox — event ticketing & management platform (Vietnamese market, Ticketbox-style).
**Audience:** consumers browsing/buying tickets + organizers/admins managing events.
**Tone:** vibrant, content-first, trustworthy, energetic but clean.

---

## Style

**Clean Flat + soft glow.** 2D, bold color, minimal shadows, rounded corners, icon-forward.
- Radius: `--radius: 0.75rem` → `sm/md/lg/xl` derived.
- Elevation: one soft glow scale only — `.card-glow` (cyan-tinted), no random shadows.
- Transitions: 150–300ms ease for micro-interactions.
- Icons: **Lucide only** (stroke ~1.8–2). No emoji as structural icons.

## Color (semantic tokens — never hardcode hex in components)

Defined in `globals.css` as CSS variables; Tailwind classes (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`, `bg-primary`) map to them and adapt per theme.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--background` | `#f8fafc` | `#0b1120` | page |
| `--card` / `--color-surface` | `#ffffff` | `#111827` | cards, surfaces |
| `--foreground` / `--color-text` | `#0f172a` | `#e2e8f0` | primary text |
| `--muted` | `#f1f5f9` | `#1e293b` | input/well surface |
| `--muted-foreground` / `--color-text-secondary` | `#64748b` | `#94a3b8` | secondary text |
| `--border` | `#e2e8f0` | `#334155` | borders/dividers |
| `--primary` | `#0891b2` (cyan-600) | `#22d3ee` (cyan-400) | brand, CTAs |
| `--primary-hover` | `#0e7490` | `#67e8f9` | CTA hover |
| `--primary-foreground` | `#ffffff` | `#0b1120` | text on primary |
| `--destructive` | `#f43f5e` | `#fb7185` | danger |

**Accent gradients** (KPI cards / highlights): `.gradient-primary` cyan, `.gradient-rose`, `.gradient-emerald`, `.gradient-amber`.
**Status colors** (badges): emerald=success, amber=warning/draft, rose/red=danger/cancelled, cyan=default — keep literal, always pair with text (not color-only).

**Dark mode:** `.dark` class on `<html>` (toggle persists to `localStorage`, no-FOUC script in `layout.tsx`, respects system pref). Elevation order dark: `bg #0b1120 < card #111827 < input/border #334155`. The **footer + mobile bottom-nav are a fixed dark band in both themes**.

## Typography

**Be Vietnam Pro** (`--font-sans`, weights 400/500/600/700/800) — chosen for full Vietnamese diacritic support. `display: swap`.
- Scale: 12 / 14 / 16 / 18 / 24 / 32 px. Body 16px min on mobile (avoids iOS zoom).
- Weight hierarchy: headings 600–800, labels 500–600, body 400. Line-height 1.5–1.6.
- Headings default `font-weight: 600` (utilities override).

## Layout & spacing

- Spacing rhythm: 4 / 8 px scale.
- Container max-width: **1280px** (`max-w-[1280px]` / 7xl-ish); keep consistent across header, sections, footer.
- Breakpoints: 375 / 640 / 768 / 1024 / 1440.
- Fixed header height token: `--header-height` (112px desktop, 64px ≤1023px) — offset content with it.
- Mobile bottom-nav height: `--mobile-nav-height: 64px`.
- Use `min-h-dvh` (not `100vh`). No horizontal scroll on mobile.

## Navigation

- Desktop home: fixed gradient header + sub-nav (categories). Dashboard: sidebar (`hidden lg:flex`) + mobile drawer.
- Mobile: bottom nav ≤5 items, icon + label, route-driven active state (`aria-current`), real `<Link>`s.
- Active state always visible; destructive actions (logout/delete) visually separated.

## Components (conventions)

- **Buttons:** `src/components/ui/Button.tsx` (variants default/destructive/outline/secondary/ghost/link). Primary = `bg-primary`. One primary CTA per screen.
- **Cards:** `src/components/ui/Card.tsx` + `.card-glow`.
- **Badges:** `src/components/ui/badge.tsx` (status variants).
- **ThemeToggle:** `src/components/ui/ThemeToggle.tsx`.
- Forms: visible labels, error below field, semantic input types (`email`/`tel`/numeric), password show/hide, disabled + loading states, autocomplete.

## Accessibility (must-pass)

- Contrast ≥ 4.5:1 body / 3:1 large — verified for both themes.
- Visible focus rings; full keyboard nav; `aria-label` on icon-only buttons.
- Touch targets ≥ 44×44.
- `prefers-reduced-motion` respected (global rule in `globals.css`).
- Color never the sole signal (pair with icon/text).

## Avoid (anti-patterns)

- Hardcoded hex in components (use tokens). Emoji as icons. Mixed icon sets/stroke widths.
- White-on-dark-band (footer surfaces use scoped dark tokens). Cluttered layouts. Layout-shifting hover.
- `100vh` on mobile; fixed-px container widths; disabling zoom.

---

## Page overrides

Page-specific deviations live in `design-system/pages/<page>.md` and override this file. None yet.
