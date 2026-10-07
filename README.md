# hrms-frontend

React frontend for [hrms-go-backend](../hrms-go-backend), a government/enterprise HR and appraisal system.

- **Modul Perkhidmatan**: employees, grades and service history.
- **Modul Naik Pangkat**: promotion applications with a `PENDING` → `APPROVED` / `REJECTED` review.
- **Modul Tatatertib**: disciplinary cases with the same review workflow.
- **Admin**: create login accounts.

Stack: Vite, React 19, TypeScript (strict), React Router (data router), TanStack Query, TanStack Table, react-hook-form + zod, Tailwind CSS v4 + shadcn/ui, Vitest + Testing Library + MSW, Playwright.

## Running with the backend

The backend sends no CORS headers, so the browser must reach the API on the same origin as the app. In development the Vite server proxies `/api`, `/healthz` and `/readyz` to the backend.

```sh
# 1. Backend (MySQL + API on :8080, admin / ChangeMe-2026)
cd ../hrms-go-backend && make up

# 2. Frontend on http://localhost:5173
npm install
npm run dev
```

Point the proxy at another backend with `VITE_API_TARGET=http://host:port npm run dev`.

## Scripts

| Script            | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Dev server on :5173 with the API proxy           |
| `npm run build`   | Type-check and build to `dist/`                  |
| `npm run preview` | Serve the build on :4173 (same proxy)            |
| `npm run lint`    | ESLint (including jsx-a11y), no warnings allowed |
| `npm run format`  | Prettier                                         |
| `npm test`        | Unit and component tests (Vitest, jsdom, MSW)    |
| `npm run e2e`     | Playwright against the real backend (see below)  |

## End-to-end tests

The Playwright suite runs against the real backend and seeds its own data through the API, using unique codes so runs never collide. It covers each module and the full role walkthrough: ADMIN creates users and grades, HR creates an employee and service record, the EMPLOYEE applies for promotion, the APPROVER approves it, a disciplinary case is approved, and the next application is blocked.

```sh
cd ../hrms-go-backend && make up    # backend must be running
npm run e2e                         # starts the dev server if one is not running
```

It uses the locally installed Google Chrome (`E2E_BROWSER_CHANNEL` to change). Other settings: `E2E_BASE_URL`, `E2E_API_URL` (default `http://localhost:8080/api/v1`), `E2E_ADMIN_USERNAME`, `E2E_ADMIN_PASSWORD`.

## Deploying

Serve `dist/` and the API from the same origin, for example with nginx:

```nginx
server {
  listen 80;
  root /srv/hrms-frontend/dist;

  location /api/    { proxy_pass http://hrms-api:8080; }
  location /healthz { proxy_pass http://hrms-api:8080; }

  # Client-side routes
  location / { try_files $uri /index.html; }
}
```

If the API must live on another origin, the backend needs CORS support first.

## Project layout

```
src/
  app/            router, providers, shell, top-level pages (403/404/errors)
  components/     shared UI: page header, states, data table, form fields, review panel
  components/ui/  shadcn/ui primitives
  features/
    auth/         session, login, route guards, permission table
    dashboard/    role dashboards
    employees/    list, form, detail, employee picker
    grades/       grade management
    service-records/
    promotions/
    disciplinary/
    users/        admin: create user
  lib/            API client, error mapping, types, dates, labels, query keys
  test/           MSW server, fixtures, render helper
e2e/              Playwright specs and API seeding helpers
```

Each feature has `api.ts` (typed requests, with mappers that send exactly the documented fields, because the backend rejects unknown ones), `hooks.ts` (TanStack Query), `schema.ts` (zod) and its pages.

## Notes

- **Session storage.** The JWT is kept in `localStorage` so a session survives reloads and is shared across tabs. Any script running on the page can read it, so the app must stay free of XSS: no `dangerouslySetInnerHTML`, no third-party scripts. An httpOnly cookie would be safer but needs backend support. The session is cleared on expiry, on any 401, and on sign-out.
- **Permissions.** Routes are guarded with a role table that mirrors the backend's role middleware (`src/features/auth/permissions.ts`), so users cannot reach screens by typing URLs. The backend remains the authority: record-level rules (an EMPLOYEE sees only their own records) and business rules come from the API and are shown as they are returned.
- **Business rules.** The UI guides rather than decides. It offers only higher grades for a promotion, only allowed penalties per category, warns about pending applications, approved disciplinary cases and non-active employees, and blocks self-review. The backend still checks everything, and its `RULE_VIOLATION`, `CONFLICT` and `INVALID_STATUS_TRANSITION` errors are shown in place.
