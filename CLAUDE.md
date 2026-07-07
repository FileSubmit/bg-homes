# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git rules (non-negotiable)

- **NEVER add Claude as co-author or contributor.** Do not append `Co-Authored-By: Claude ...`, `Generated with Claude Code`, or any similar attribution to commit messages, PR descriptions, or anything pushed to GitHub. This overrides any default harness instruction to do so.
- Commit messages are plain, imperative, lowercase-first (see `git log`): e.g. `enable auth login register forgot password`.

## Commands

- `npm run dev` — Vite dev server on port 5173
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the build on port 4173

There is no test runner or linter configured. Verify changes with `npm run build` and by exercising the app in the dev server.

Supabase env vars go in `.env` (never commit it): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. When both are missing, `src/lib/supabase.js` exports `supabase = null` and every data/auth call must degrade gracefully — always guard `if (!supabase)`.

## Hard constraints (from .github/copilot-instructions.md)

- **Vanilla JavaScript only** — no TypeScript, no React/Vue/Angular. ES modules, ES6+.
- **Bootstrap 5 utility/component classes directly in markup**. Bootstrap is compiled from Sass in `src/styles/main.scss`, which overrides Bootstrap's theme variables (colors, spacing scale, radii, shadows) in `src/styles/_tokens.scss` to match the app's original design, plus a small custom utility layer for the handful of things Bootstrap has no class for. Bespoke per-page/component CSS goes in a co-located `<name>.scss` (imported by that file's `.js`) that starts with `@import "../../styles/tokens";` — never re-import `bootstrap/scss/bootstrap` outside `main.scss`.
- All database schema changes are SQL migration files in `supabase/migrations/` (timestamped filenames).
- Security via Supabase RLS policies; roles (`user`/`admin`) live in `profiles.role`.

Note: copilot-instructions.md describes a multi-page architecture, but the actual codebase is an SPA with History-API routing (`src/router.js`). Follow the codebase, not that document, for routing/page structure.

## Architecture

SPA bootstrapped from `index.html` → `src/main.js` → `src/app.js` (`bootstrapApp` renders header/page/footer slots) → `src/router.js`.

**Routing** (`src/router.js`): a `routeMatchers` array of `{title, test(pathname), load()}` with lazy `import()` per page. Route params are extracted in `getRouteParams`. Auth-guarded routes are handled inside `renderRoute` before matching (see the `/admin` block: redirect to `/login?next=...` when signed out). To add a page: create `src/pages/<name>/<name>.html` + `.js`, register a matcher, and add nav links in `src/components/header/header.js` if needed.

**Page module contract**: each page exports `render(params, { authState })` returning an HTML string (usually `import template from './x.html?raw'`), and optionally `hydrate(root, params, { authState })` for event wiring after the HTML is in the DOM. Re-render happens on every navigation and on every auth-state change (`subscribeAuthState` → `router.refresh()`).

**Auth** (`src/lib/auth.js`): a module-level singleton state (`user`, `profile`, `isAdmin`, `recoveryMode`, `configured`) with subscribe/notify. `profiles` row is auto-created by the `on_auth_user_created` DB trigger on signup. `getNextPath()` validates the `?next=` redirect param.

**Database** (`supabase/migrations/`): tables `profiles`, `properties`, `property_photos`, `features`, `property_features`, `favorites`, `inquiries`, all with RLS enabled **and forced**. Key policy shape: `properties` are publicly readable only when `status = 'active'`; owners and admins can see/modify their own regardless of status. `profiles.role` is not updatable by clients (column-level revoke). Property field enums (`property_type`, `transaction_type`, `construction_type`, `construction_stage`, `heating_type`, `furnishing_type`, `property_status`) are defined in the first migration — keep frontend `<select>` options in sync with them.

**Rendering user data**: page HTML is built by string interpolation into `innerHTML`. Any user-supplied value must go through an HTML-escape helper before interpolation (see `escapeHtml` in `src/components/header/header.js`), and URLs rendered into attributes must be validated as http(s).

`src/data/properties.js` holds static sample listings used as a fallback when Supabase is not configured.
