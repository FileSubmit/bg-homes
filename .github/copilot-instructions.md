# Project Context
Project Name: BG Homes
Description: A real estate listings web application where users can view, add, edit, and delete property listings. 
Tech Stack: HTML5, CSS3, Vanilla JavaScript, Bootstrap 5, Vite, Node.js, npm, Supabase (Auth, Database, Storage).
Architecture: Client-server architecture communicating with Supabase REST API/Client. Multi-page web application.

# Core Development Rules & Constraints

## 1. Frontend & Tech Stack
- STRICT RULE: Use ONLY Vanilla JavaScript. DO NOT use TypeScript, React, Vue, Angular, or any other JS UI frameworks.
- Use Bootstrap 5 for all layout, styling, and UI components. Apply utility/component classes directly within the HTML files and JS-rendered templates.
- Bootstrap is built from Sass (`src/styles/main.scss`), with its theme variables overridden to match the app's palette (see `src/styles/_tokens.scss`) and a small custom utility layer for the few things Bootstrap has no class for (exact color shades, extended spacing steps, tracking/letter-spacing, etc). Per-page/component bespoke rules go in a co-located `<name>.scss` imported by that file's `.js` — keep custom CSS scoped and minimal.
- Project is built and served using Vite (Sass support via the `sass` package, no PostCSS/Tailwind).
- PACKAGE MANAGEMENT: Use `npm` for installing and managing all project dependencies (e.g., `@supabase/supabase-js`, `vite`, `bootstrap`, `sass`).

## 2. Architecture & Navigation
- MULTI-PAGE ARCHITECTURE: Every screen must be a separate `.html` file (e.g., `index.html`, `login.html`, `register.html`, `properties.html`, `admin.html`, `details.html`).
- DO NOT implement Single Page Application (SPA) routing. 
- Avoid using popups/modals for primary navigation.
- MODULAR CODE: Split JavaScript into self-contained ES modules (e.g., `api.js`, `auth.js`, `ui.js`, `utils.js`). Do not write monolithic JS files.

## 3. Backend (Supabase)
- DATABASE: Maintain at least 4 relational tables (e.g., `profiles`, `properties`, `photos`, `favorites`). 
- MIGRATIONS: All database schema changes MUST be written as SQL migration scripts and saved in the local project folder (Supabase local development standard).
- AUTHENTICATION: Use Supabase Auth for user registration, login, and logout. Implement JWT token handling.
- AUTHORIZATION: Implement Role-Based Access Control (RBAC). Distinguish between regular users and admin users (using a `user_roles` table or user metadata). Implement an Admin Panel.
- SECURITY: Use Supabase Row-Level Security (RLS) policies to protect data access.
- STORAGE: Use Supabase Storage for uploading and downloading user files (e.g., property images).

## 4. Agent Behavior & Formatting
- Always provide Vanilla JS solutions utilizing ES6+ features.
- When generating code for new pages, remind me to update the `vite.config.js` to support multiple HTML entry points if necessary.
- When suggesting package installations, provide the exact `npm install` commands.
- When suggesting database changes, always provide the raw SQL for the Supabase migration file.
- Ensure all UI suggestions are responsive (mobile-first) using Bootstrap's responsive utility infixes (e.g., `d-md-flex`, `col-lg-4`).