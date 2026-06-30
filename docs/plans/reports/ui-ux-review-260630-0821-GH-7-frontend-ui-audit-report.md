# UI/UX Review — EventBox Frontend

**Date:** 2026-06-30 · **Branch:** EM-7-init-project-code-base · **Skill:** ui-ux-pro-max
**Scope:** `frontend/src` — globals.css, home (7 CSS-module components), shared UI primitives, auth pages, dashboard.

## Headline

Two distinct UI subsystems with opposite health:

- **Dashboard + auth pages** (Tailwind + lucide + shadcn tokens, light theme) → solid. Proper labels, focus rings, disabled states, autoComplete, SVG icons, semantic tokens that exist.
- **Home page** (CSS Modules) → **broken at render time.** Built against a dark-theme token vocabulary that `globals.css` never defines. Result: invisible headings, invisible footer/nav text, transparent cards, header overlapping hero.

Root cause: home CSS modules were authored for a *different* design system (`--color-surface`, `--color-text-*`, `--header-height`, `--space-*`, `--transition-*`) than the shadcn light-theme tokens in `globals.css` (`--background`, `--foreground`, `--card`, `--primary`, `--border`). The two were never reconciled. Undefined `var()` → CSS drops the declaration → values fall back to inherited/transparent.

---

## CRITICAL

**C1 — Missing design tokens break the whole home page.** `globals.css:38-66`
7 CSS files reference tokens defined nowhere: `--color-surface`, `--color-surface-hover`, `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-primary-light`, `--color-primary-50`, `--color-bg`, `--header-height`, `--space-lg`, `--space-md`, `--transition-fast`, `--transition-base`. (`--mobile-nav-height` defined with fallback only in `MobileBottomNav.module.css:6`, but used *without* fallback in `page.module.css:25` → 0.) Rule: color-semantic, consistency. C2–C5 are direct consequences.

**C2 — Section headings invisible (white-on-white).** `EventSection.module.css:29` `.title { color:#fff }` on `--background:#f8fafc`. "🔥 Sự kiện nổi bật / 📈 Xu hướng / 📅 Sắp diễn ra" render invisible. Rule: color-contrast (4.5:1).

**C3 — Footer + mobile-nav text invisible (dark-on-dark).** Footer & MobileBottomNav use bg `#111827` but set text via undefined `--color-text-muted`/`--color-primary-light` → inherit body `--foreground:#0f172a` → dark text on dark bg. All footer links/description/contact/copyright + every bottom-nav label invisible. `Footer.module.css:44,101,117,177,196`, `MobileBottomNav.module.css:26,37,42`. Rule: color-contrast.

**C4 — Fixed header overlaps content.** Header is `position:fixed` (72px + 40px subnav desktop / 64px mobile) but `.main` has no top offset and `HeroBanner.module.css:5` `margin-top:var(--header-height)` → 0. Hero + page content sit under the header. `Header.module.css:1-8`, `page.module.css:2-5`. Rule: fixed-element-offset.

**C5 — Transparent surfaces.** `EventCard.module.css:2`, `CategoryNav.module.css:42`, `HeroBanner.module.css:21` use `background:var(--color-surface)` (undefined) → transparent cards, no surface separation from page. Rule: surface-readability, elevation-consistent.

**C6 — No `prefers-reduced-motion` support.** `globals.css` `scroll-behavior:smooth` + fade/pulse/shimmer keyframes, all hover `transform` lifts, HeroBanner carousel — none gated. Rule: reduced-motion.

**C7 — Auto-advancing carousel, no pause/stop.** `HeroBanner.tsx:26-29` rotates every 5s; no pause-on-hover/focus, no play/pause control, ignores reduced-motion. Fails WCAG 2.2.2 Pause/Stop/Hide. Rule: reduced-motion, motion-meaning.

---

## HIGH

**H1 — Font setup broken.** `layout.tsx:6-10` loads **Inter**, assigns to `--font-outfit` (never referenced). `globals.css:81` body font-family is `'Be Vietnam Pro'` — never imported → falls back to system. Loaded font unused; intended font not loaded. Rule: font-loading, font-pairing.

**H2 — Invalid HTML: `<button>` inside `<a>`.** `HeroBanner.tsx:52-54` `<a href><button>…</button></a>`. Interactive nested in interactive — invalid, unpredictable a11y/keyboard. Rule: semantic controls.

**H3 — Touch targets < 44px.** Header `mobileIconBtn` 38×38 (`Header.module.css:262`); HeroBanner arrows 36×36 on mobile (`:248`); dashboard Header bell `h-9 w-9` 36px; Events row actions `h-8 w-8` 32px. Rule: touch-target-size (min 44×44).

**H4 — Hover-only actions unreachable on touch.** `events/page.tsx:165` Eye/Edit/Delete are `opacity-0 group-hover:opacity-100` → no access on touch (no hover); focusable-but-invisible for keyboard. Rule: hover-vs-tap, gesture-alternative.

**H5 — Dashboard not responsive.** `dashboard/layout.tsx` + `Sidebar.tsx:47` fixed 256px sidebar always shown, no collapse/drawer → ~68% of a 375px screen. Rule: adaptive-navigation, mobile-first.

**H6 — Bottom nav doesn't navigate.** `MobileBottomNav.tsx` tabs are `<button>` with local `activeTab` state — no routing/href, no active-route reflection, no deep-linking. Rule: deep-linking, nav-state-active.

---

## MEDIUM

- **M1** Dark/light contradiction: components built for dark surfaces (#111827, #fff text, `rgba(0,0,0,0.3)` shadows) but tokens are light theme. `@custom-variant dark` declared (`globals.css:3`) but no `.dark` token block → dark mode non-functional. Rule: dark-mode-pairing.
- **M2** `EventCard.module.css:7` `transition:all 0.3s` + hover `translateY(-6px)` + `box-shadow rgba(0,0,0,0.3)` — avoid animating `all`; 30% black shadow too heavy for light theme. Rule: transform-performance, elevation-consistent.
- **M3** Emoji as structural section icons — `page.tsx:43,50,58` pass "🔥/📈/📅" in titles. Rule: no-emoji-icons (use SVG).
- **M4** No-op animation classes: `animate-shake` (`login/page.tsx:90`), `animate-fade-down` (`register/page.tsx:196`) — keyframes not defined.
- **M5** Inputs: phone `type="text"` (→ tel), OTP `type="text"` (→ inputMode numeric); no password show/hide toggle. `register/page.tsx:154,205`, `login/page.tsx:131`. Rule: input-type-keyboard, password-toggle.
- **M6** Search inputs lack label/aria-label (`Header.tsx:34` desktop, dashboard `Header.tsx:41`). Rule: form-labels.
- **M7** `min-h-screen` / `100vh` instead of dvh (`login`, `register`, `page.module.css:3`). Rule: viewport-units.
- **M8** Dashboard chart: leftover violet palette (gridline `#ede9fe`, tooltip shadow `rgba(139,92,246)` — `dashboard/page.tsx:155,180`) clashes with cyan brand; recharts entrance ignores reduced-motion; no empty/loading/error states. Rule: motion-consistency, empty-data-state.

## LOW

- **L1** `globals.css:92` `h1..h6 { font-weight:inherit }` strips default heading weight → flat hierarchy unless every heading sets weight. Rule: weight-hierarchy.
- **L2** Container width inconsistent: Footer `max-width:1200px` vs header/sections `1280px`. Rule: container-width.
- **L3** Scrollbar thumb cyan-200 on slate-100 — very low contrast (decorative).
- **L4** Pervasive hardcoded hex in home CSS modules instead of tokens (cosmetic; couples to no design system).

---

## Recommended fix order

1. **Decide the theme** (light is implied by globals.css + auth/dashboard). Pick one source of truth.
2. **Reconcile tokens (C1)** — either (a) add the missing `--color-*`/`--space-*`/`--header-height`/`--transition-*` tokens to `globals.css` mapped to the light theme, or (b) rewrite home CSS modules onto existing shadcn tokens. (a) is faster; (b) is cleaner long-term. *Note:* (a) alone won't fix C2/C3 because those hardcode `#fff` / dark bg — fix surface+text colors together for the chosen theme.
3. **Layout offset (C4)** — define `--header-height` and apply top padding to `.main`/hero.
4. **Reduced-motion + carousel (C6/C7)**, then **fonts (H1)**, **nested button (H2)**.
5. Touch targets (H3), touch-reachable actions (H4), responsive dashboard (H5), real bottom-nav routing (H6).
6. Medium/Low polish.

---

## Fixes Applied — 2026-06-30 (theme decision: LIGHT, dark footer/nav band kept)

Verified: `tsc --noEmit` exit 0; eslint on changed files 0 errors (only pre-existing `<img>` warnings).

**Critical**
- C1 — Added the missing tokens to `globals.css :root` (`--color-surface/-hover`, `--color-text/-secondary/-muted`, `--color-primary-light/-bright/-50`, `--color-bg`, `--header-height` + responsive 64px ≤1023px, `--mobile-nav-height`, `--space-md/-lg`, `--transition-fast/-base`), mapped to the light theme.
- C2 — `EventSection .title` `#fff` → `var(--color-text)`.
- C3 — Footer + MobileBottomNav on-dark accents → `--color-primary-bright` (#22d3ee); `--color-text-muted` set to slate-300 (visible on dark).
- C4 — `--header-height` now defined → hero clears the fixed header (responsive 112/64).
- C5 — Surfaces (`--color-surface`) now resolve to white.
- C6 — Added global `@media (prefers-reduced-motion: reduce)` killing animations/smooth-scroll.
- C7 — HeroBanner carousel pauses on hover/focus and when reduced-motion is set; gated on `total > 1`.

**High**
- H1 — `layout.tsx` now loads **Be_Vietnam_Pro** → `--font-sans`; body font-family references it.
- H2 — Hero CTA `<a><button></a>` → single styled `<a>`.
- H3 — Touch targets ≥44: mobile header icons 38→44, hero arrows 36→44.
- H4 — Events row actions always visible on touch (subtle-until-hover only ≥sm); +aria-labels; 32→36px.
- H5 — Dashboard layout now a drawer shell: desktop sidebar `hidden lg:flex`; mobile slide-in drawer + scrim + hamburger in Header; closes on nav tap (no setState-in-effect).
- H6 — MobileBottomNav now `<Link>` + `usePathname` active state + `aria-current`.

**Medium**
- M2 — EventCard `transition:all`→specific props; hover lift 6→4px; shadow 30%-black → soft cyan.
- M3 — Emoji section markers replaced with Lucide icons (`Flame/TrendingUp/CalendarClock`) via new `EventSection icon` prop.
- M4 — Added `shake` + `fadeDown` keyframes (were no-ops).
- M5 — Password show/hide toggles (login+register); phone `type=tel`; OTP `inputMode=numeric` + `one-time-code`.
- M6 — aria-labels on home + dashboard search inputs.
- M7 — `100vh`→`100dvh` (home main, dashboard shell).
- M8 — Dashboard chart violet palette → cyan/slate.

**Low**
- L1 — `h1..h6 { font-weight: inherit }` → `600` default.

**Also fixed (pre-existing, found during verify):** import casing `@/components/ui/card`→`Card`, `button`→`Button` (would break case-sensitive/Linux build); home Header logo `<a href="/">` → `<Link>`.

## Not done / deferred (out of UI-fix scope)

- `<img>` → `next/image` across EventCard / HeroBanner / Sidebar / dashboard Header (warnings; needs remote-domain config).
- Pre-existing eslint **errors** untouched: `@typescript-eslint/no-explicit-any` in `accounts/page.tsx`, `login`, `register`, `dashboard/page.tsx`; unused imports; `accounts/page.tsx` setState-in-effect.
- Dashboard chart: empty/loading/error states + reduced-motion for recharts entrance (M8 partial — palette only).
- `.dark` token block not built (light theme chosen).

## Unresolved questions

1. **Bottom-nav scaffold routes** — `/su-kien` and `/ve-cua-toi` don't exist yet (Khám phá / Vé của tôi tabs). Confirm the intended paths or whether those pages are planned.
2. **Want the pre-existing eslint errors** (`any` types, unused vars, accounts effect) cleaned up too? They block a strict `next build`/CI but are outside the UI/UX scope.
3. **`<img>` → `next/image`** — worth doing for LCP, but needs the remote image domains configured. Proceed?
