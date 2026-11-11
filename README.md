# Global Opportunities

A multilingual platform for discovering funding opportunities, preparing projects, applying, and tracking funding through to verified impact. The backend is a Django REST API in `backend/`; the frontend is a Next.js App Router application in `frontend/`.

The authoritative requirements document is `docs/Global Opportunities — Complete Full-Stack Master Prompt (1).pdf`. This README records what the code actually does today, what the specification asks for, and the gap between them.

---

## 1. Status at a glance

| Area | State |
| --- | --- |
| Public landing page | Implemented — 16 sections, mobile-first, WCAG AA contrast, *labels* translated into 4 locales |
| Registration / login | Implemented and working against the API |
| Logged-in experience | **Not built** — no dashboard, profile, or any authenticated route. The navbar only reflects the session to hide its registration CTA. |
| API surface | 8 of the 14 apps contribute routes; 4 have no `urls.py` at all |
| Data model | 25 model classes across 12 apps |
| Database | **Only 2 of 11 apps with models have migrations**; the other 9 have no tables |
| Authorisation | Models exist, but no role checks are enforced anywhere |
| Translations | 4 locales, 209 keys each, wired through `lib/i18n.tsx` and enforced by `check:catalogue`. Body copy is English only — see [§3.3](#33-frontend) |
| Background work | Celery is configured; no tasks exist |
| File storage | Local `ImageField` only; no object storage configured |

**A fresh clone does not run end to end.** Two commands are required before the API is usable — see [§4](#4-running-the-project-locally). The most important single fact: `python manage.py migrate` creates tables for `persons` and `accounts` only, so `/api/opportunities/` returns a database error until the missing migrations are generated.

---

## 2. Technology stack

### Backend
- Python 3.12, Django 5.2, Django REST Framework
- SimpleJWT (JWT authentication, no sessions)
- PostgreSQL, Redis, Celery
- `django-filter`, `drf-spectacular` (OpenAPI), `django-cors-headers`
- `django-storages` (installed, not configured)

### Frontend
- Next.js (App Router), React, TypeScript (strict)
- Tailwind CSS, PostCSS
- React Hook Form + Zod
- TanStack Query. `next-intl` is installed but unused — `lib/i18n.tsx` covers what it was installed for, and the unused dependency should be dropped.

---

## 3. Repository layout and the role of every file

### 3.1 Root

| Path | Role |
| --- | --- |
| `README.md` | This file: architecture, setup, and conformance status. |
| `docs/*.pdf` | The authoritative specification. Not executable; treat as the source of truth for requirements. |
| `.gitignore` | Excludes `.env`, `node_modules`, `.venv`, `.next`, `__pycache__`, and local database files. |

### 3.2 `backend/`

#### Entry point and project configuration

| Path | Role |
| --- | --- |
| `manage.py` | Django's command-line utility. Sets `DJANGO_SETTINGS_MODULE` to `config.settings` and delegates to `django.core.management`. |
| `config/__init__.py` | Package marker. Imports the Celery app so workers start correctly — this is why tasks are discoverable when running `celery -A config`. |
| `config/settings.py` | The single source of configuration: env loading, `INSTALLED_APPS`, middleware, templates, database, password validators, `MEDIA_*`, CORS, DRF defaults (JWT-only auth, page-number pagination at 20/page, filter backends, throttle rates), SimpleJWT lifetimes (10-minute access, 1-day refresh), Celery, and security headers. |
| `config/urls.py` | Root URL configuration. Mounts the Django admin, the DRF browsable-API login, the OpenAPI schema endpoints, media serving in `DEBUG`, and the per-app `urls.py` files. |
| `config/asgi.py` | ASGI entry point for async servers. Not yet configured with Channels, so it behaves as a plain HTTP app. |
| `config/wsgi.py` | WSGI entry point used by conventional servers. |
| `config/celery.py` | Creates the `global_opportunities` Celery app, reads `CELERY_*` settings from Django settings, and auto-discovers `tasks.py` modules. |
| `requirements.txt` | Pinned backend dependencies. |
| `.env.example` | Template for the environment variables settings reads. Copy to `.env`; never commit the real file. |
| `.env` | Local secrets. Git-ignored. Do not commit or share. |
| `db.sqlite3` | **Stale artefact.** Settings use PostgreSQL exclusively; this file is unused and safe to delete. |

#### Domain apps — `backend/apps/`

Each app is a self-contained Django app with a standard layout: `apps.py` (app config), `models.py` (schema), and, where an API exists, `serializers.py`, `views.py`, and `urls.py`.

| App | Role | API mounted at |
| --- | --- | --- |
| `accounts` | Custom `User` (email login, no username), `Person` link, `Role`, `UserRole` grants, JWT auth endpoints, registration, throttling | `/api/auth/` |
| `persons` | The profile record for a user: names, date of birth, gender, contact, Burundian address hierarchy, profile photo | none (model only) |
| `organizations` | Implementing organisations and their membership | **not mounted** |
| `opportunities` | Funding opportunities and calls, with filtering, search, and pagination | `/api/opportunities/` |
| `calls` | Calls for projects | **not mounted** |
| `projects` | Project records and the documents that belong to them | `/api/projects/` |
| `applications` | Applications linking a project to an opportunity, with workflow status and a `SelectionDecision` | `/api/applications/` |
| `evaluations` | Scoring criteria and reviewer scores | **not mounted** |
| `funding` | Awarded funding, disbursements, and payments | `/api/funding/`, `/api/disbursements/`, `/api/payments/` |
| `documents` | Uploaded files with category and review state | `/api/documents/` |
| `notifications` | In-app notifications and per-user preferences | `/api/notifications/` |
| `ai_assistant` | The `/api/ai/chat/` endpoint | `/api/ai/` |

File-level detail:

| Path | Role |
| --- | --- |
| `apps/__init__.py` | Package marker for the app collection. |
| `apps/<app>/__init__.py` | Package marker. Intentionally empty — an empty `__init__.py` is idiomatic Python and contains no code to document. |
| `apps/accounts/models.py` | `User` (email-based, `status`, `email_verified_at`), `Role`, `UserRole` with a uniqueness constraint. |
| `apps/accounts/serializers.py` | `RegisterSerializer` (password policy, first-name validation) and the user/role serializers. |
| `apps/accounts/views.py` | Register, login (returns access + refresh), and the current-user endpoint. |
| `apps/accounts/throttles.py` | Rate limits for login and registration, to slow credential stuffing. |
| `apps/accounts/urls.py` | Auth routes, including a register/login pair that SimpleJWT also exposes. |
| `apps/accounts/migrations/0001_initial.py` | Generated schema history for `Role`, `User`, `UserRole`. Depends on `persons`. |
| `apps/persons/migrations/0001_initial.py` | Generated schema history for `Person`. |
| `apps/opportunities/views.py` | The opportunity viewset. Filtering, search, ordering, and pagination are configured; **write permissions are too broad** (see [§6](#6-known-defects)). |
| `apps/funding/views.py` | Funding, disbursement, and payment viewsets. **Querysets are not scoped to the requesting user** (see [§6](#6-known-defects)). |
| `apps/ai_assistant/views.py` | Returns a **static, hard-coded response**. No model, no retrieval, no language handling. |

### 3.3 `frontend/`

The public landing page is built; the rest of the specification's routes are not. 38 TypeScript
source files, of which the 16 landing sections and the shared primitives are described below.

| Path | Role |
| --- | --- |
| `app/layout.tsx` | Root layout. Loads Inter/Fraunces, declares the site metadata and viewport, and mounts `Providers` (TanStack Query + `I18nProvider`). `<html lang>` follows the active locale. |
| `app/providers.tsx` | Wraps children in the TanStack Query client, then the locale provider — the locale has to sit above anything that calls `t()`. |
| `app/page.tsx` | The public landing page: all sixteen sections plus navbar, footer, and a skip link. Sample data comes from `lib/content.ts` and is visibly labelled; it is not fetched. |
| `app/globals.css` | Tailwind directives plus the brand utilities: `.display` (serif headline face), `.mesh`, `.glass`, `.grid-fade`, `.grid-lines`, the `.btn-*` family, `.chip-muted`, the focus-visible ring, and the `prefers-reduced-motion` block. Also the responsive foundation: the `--step-*` fluid type scale, `--gutter`, `--tap`, and `--nav-h` (which includes the `env(safe-area-inset-top)` notch clearance, because it is also what positions anchor targets). |
| `app/auth/login/page.tsx` | Login form. Validates with Zod, calls `/api/auth/login/`, stores the access token in `sessionStorage` (`lib/session.ts`). |
| `app/auth/register/page.tsx` | Registration form. Mirrors the server's password policy so the user gets immediate feedback. |
| `components/layout/` | `navbar.tsx` (sticky, scroll-reactive, tracks the active section with one `IntersectionObserver`, hides the registration CTA when signed in, and drops to a menu below `xl` because French and Kirundi need ~1117px for the inline links), `footer.tsx`, `language-menu.tsx`, `skip-link.tsx`. |
| `components/landing/` | One file per section: `hero`, `trust`, `discovery`, `features`, `showcase`, `how-it-works`, `benefits`, `ecosystem`, `project-showcase`, `ai-assistant`, `languages`, `testimonials`, `impact`, `pricing`, `faq`, `final-cta`. `app-window.tsx` is the decorative frame the mock product screens sit in. |
| `components/ui/` | `section.tsx` (`Section` + `SectionHeading`), `reveal.tsx` (`Reveal`/`Stagger`), `icon.tsx`, `logo.tsx`, `ambient.tsx`, `count-up.tsx`, `spotlight-card.tsx`. |
| `components/auth/password-field.tsx` | Reusable accessible password input with a show/hide toggle. |
| `lib/i18n.tsx` | Locale provider: `t()` for single strings, `list()` for arrays, numeric path indexing, `<html lang>` sync, and a `localStorage` preference. |
| `lib/session.ts` | Reads/writes the access token in `sessionStorage` and clears it on sign-out. Defensive: `sessionStorage` throws in some privacy modes. |
| `lib/content.ts` | All landing fixtures — capability facts, sample opportunities/projects/ecosystem actors, FAQ answers, nav and footer links — each tagged with the catalogue keys its labels use. |
| `lib/api.ts` | The API client. Builds URLs, attaches the access token, decodes `detail`/`errors` into a thrown `ApiError`. **Only POST helpers exist** — there is no GET support yet. |
| `scripts/check-catalogue.cjs` | Locale key parity and array-length parity with `content.ts`. |
| `scripts/check-stagger.cjs` | Every `<Stagger>` child forwards both animation props. |
| `scripts/check-contrast.cjs` | WCAG ratios for the palette in `tailwind.config.ts`. |
| `scripts/check-responsive.cjs` | Clamp ordering, token/utility agreement, `env()` fallbacks, tap targets. |
| `scripts/check-css.cjs` | Built-stylesheet selectors and skip-link focus behavior. Needs a build first. |
| `scripts/scan-hardcoded.cjs` | Advisory: reports hard-coded interface strings. |
| `messages/{en,fr,rn,sw}/landing.json` | The 209-key landing catalogue. Interface strings only — long-form body copy stays English under the documented GAP, and sample records stay in the language they were entered in. |
| `messages/*/common.json` | Auth form strings. |
| `next.config.ts` | `reactStrictMode` and the `/api/:path*` rewrite that proxies to Django. |
| `tailwind.config.ts` | Content globs, the pine/gold/slate ramps, and the `ink`/`surface` light-theme tokens. New component directories must be added to `content`. |
| `postcss.config.mjs` | Tailwind and Autoprefixer. |
| `eslint.config.mjs` | Flat config extending `next/core-web-vitals` and `next/typescript`. |
| `tsconfig.json` | Strict TypeScript. The `@/*` alias resolves to the `frontend/` root. |
| `package.json` / `package-lock.json` | Dependencies and the exact resolved tree. |
| `next-env.d.ts` | Generated by Next.js. Do not edit. |
| `tsconfig.tsbuildinfo` | Build artefact from `tsc --incremental`. Git-ignored in spirit; safe to delete. |

`package.json`, `tsconfig.json`, and the `messages/*.json` files are strict JSON and cannot carry comments without breaking their parsers. They are documented here instead.

#### The responsive system

Three decisions carry most of the mobile-first behaviour, and all three are enforced by
`check:responsive` rather than by convention.

**Type is fluid, not stepped.** `--step-h1` through `--step-eyebrow` are
`clamp(min, preferred, max)` values, consumed as `.text-step-h1` and so on. A
`text-3xl sm:text-4xl lg:text-[2.75rem]` ramp has a fixed floor, and the floor is
what a 320px phone gets: 42px of headline wraps to five lines and pushes the hero's
buttons below the fold. The clamps bottom out at 2.1rem for `h1` and reach their
ceiling near 1280px.

**The gutter is one value.** `--gutter` replaces the `px-5 sm:px-6 lg:px-10` pattern
that used to appear on every section. The old form put a visible jump in the content
edge at 640px and 1024px, and it had to be retyped per section.

**Breakpoints are chosen by when content fits, not by device names.** Two examples
that were corrected: `discovery.tsx` went from `md:grid-cols-2 xl:grid-cols-3` to
`md:grid-cols-2 lg:grid-cols-3`, because an opportunity card is dense and two across
a 1024px tablet is not enough; and `features.tsx` went from a 6-column track with
mixed spans to a 4-column one, because 3 + 3 = 6 filled the first row but 2 + 2 + 2 = 6
left the sixth card alone with two empty cells beside it.

---

## 4. Running the project locally

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL and Redis (Redis is only needed once background tasks exist)

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # Windows
cp .env.example .env                                # then edit .env
.venv/Scripts/python manage.py makemigrations       # <-- REQUIRED, see below
.venv/Scripts/python manage.py migrate
.venv/Scripts/python manage.py runserver
```

> **Why the `makemigrations` step is not optional.** Nine apps have models but no migrations, so `migrate` alone creates only `persons_person` and the three `accounts_*` tables. Until the missing migrations are generated, every endpoint backed by them fails with `relation "<table>" does not exist`.
>
> **`makemigrations --check` will not catch this.** Django's dry-run questioner suppresses the "You have N unapplied app(s)" prompt, so `--check --dry-run` reports *No changes detected* even when initial migrations are missing. Use plain `makemigrations` when verifying, and do not rely on `--check` in CI for this project.

Redis/Celery are configured but not required to serve HTTP requests.

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

The frontend proxies `/api/*` to `http://127.0.0.1:8000/api` by default; set `DJANGO_API_URL` to point elsewhere. Because the browser only ever calls its own origin, CORS is not involved in local development.

### Useful checks

```bash
cd backend  && .venv/Scripts/python manage.py check
cd frontend && npm run check && npm run build && node scripts/check-css.cjs
```

`npm run check` chains six steps: `typecheck`, `lint`, `check:catalogue`,
`check:stagger`, `check:contrast`, `check:responsive`. The last three exist because
the failure modes they catch are invisible to both TypeScript and ESLint — a
missing translation key, a contrast ratio of 3.4:1, and a 36px tap target are all
valid code.

| Script | What it proves | When it can run |
| --- | --- | --- |
| `check:catalogue` | every `t("…")`/`list("…")` key exists in all four locales, and every locale has the same key set, with arrays matching `content.ts` in length | any time |
| `check:stagger` | every `<Stagger>` child forwards `staggerIndex` and `staggerStep` to a `<Reveal>`, so no animation prop is passed to a host element | any time |
| `check:contrast` | every declared text-on-surface pairing meets its WCAG threshold (4.5:1 small, 3:1 large), read from `tailwind.config.ts` | any time |
| `check:responsive` | the fluid type scale's clamps are ordered and actually fluid, every `text-step-*` utility has a matching token and a consumer, every `env()` has a fallback, and no control is sized under 44px by padding alone | any time |
| `check:hardcoded` | no untranslated interface label is left in a `.tsx` file; prints remaining candidates for review | advisory, not gating |
| `check:css` | the built stylesheet actually contains the utilities the components rely on, and the skip link really does become visible on focus | after `npm run build` |

`check:hardcoded` is deliberately outside `check`: its remaining 17 findings are
reviewed sample record content and numeric comparisons, so gating on it would fail
the build on data rather than on a defect.

---

## 5. What the specification requires and what is missing

The specification defines 32 frontend routes. Three exist.

### 5.1 Frontend routes (3 of 32 implemented)

| Group | Implemented | Missing |
| --- | --- | --- |
| Public (8) | `/` | `/about`, `/opportunities`, `/opportunities/[id]`, `/funding-opportunities`, `/funding-opportunities/[id]`, `/calls`, `/calls/[id]` |
| Auth (5) | `/auth/login`, `/auth/register` | `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password` |
| Authenticated (19) | — | `/dashboard`, `/profile`, `/organizations` (+`/create`, `/[id]`), `/projects` (+`/create`, `/[id]`), `/applications` (+`/[id]`), `/evaluations` (+`/[id]`), `/funding` (+`/[id]`), `/payments` (+`/[id]`), `/documents`, `/notifications`, `/ai` |

The public landing page `/` is implemented and links only to the two auth routes that exist. Every other destination on it is an in-page anchor (`#opportunities`, `#funding`, `#projects`, `#ai`, `#pricing`, `#faq`, …) onto one of the sixteen rendered sections, so there are no 404s from the marketing page.

Missing frontend structure: `hooks/`, `services/`, and `types/`. `components/ui/` and `components/layout/` now exist (§5.2). `messages/*/landing.json` are loaded by `lib/i18n.tsx` and drive all four locales.

### 5.2 Backend

| Required | State |
| --- | --- |
| 15 apps (including `payments`) | 14 exist. `Payment` and `Disbursement` are folded into `funding` — a defensible consolidation, but it deviates from the specified layout. |
| Migrations for all apps | Missing for 9 of the 11 apps that have models |
| `AuditLog` (audit trail app or module) | **Absent entirely** — no model, no app, no migration |
| Role-based access control | `Role` and `UserRole` exist, but **no roles are seeded** (`Role.objects.count() == 0`) and **no permission classes consult them**. Any authenticated user can act as any role. |
| API endpoints | Missing: `logout`, email verification, password reset/change, profile read/update, `calls`, `funding-opportunities`, `evaluations`, and the organizations API |
| Object-level authorisation | Not implemented — see [§6](#6-known-defects) |
| Celery tasks | None. `autodiscover_tasks()` finds nothing, so notification emails, deadline reminders, document scanning, and AI retrieval do not exist. |
| Object storage | `django-storages` is installed but no `STORAGES` setting exists, so `ImageField` uploads go to the local filesystem and will not survive a redeploy. |
| Translations | Resolved. `next-intl` remains installed but unused; `lib/i18n.tsx` is a ~200-line provider that does the work it was installed for — locale state, `t()`/`list()`, `<html lang>`, and a `localStorage` preference. `check:catalogue` fails the build if a key is missing or the four catalogues diverge. |
| Design system | Present. `components/ui/` has `icon`, `reveal`, `spotlight-card`, `count-up`, `ambient`, `logo`, `section`; `components/layout/` has `navbar`, `footer`, `language-menu`, `skip-link`. Tokens, easings, shadows, and the reveal contract live in `tailwind.config.ts` and `app/globals.css`. |
| Responsive system | Fluid type scale, fluid gutter, and a 44px tap minimum, all declared once in `app/globals.css` and enforced by `check:responsive`. See [§3.3](#the-responsive-system). |
| Contrast | The light-theme `ink` and `surface` ramps were darkened until every declared pairing passes AA — the tightest is 4.76:1. `check:contrast` recomputes all 35 pairings from `tailwind.config.ts`. |

### 5.3 Data model deviations

- `SelectionDecision` is a `OneToOneField` on `Application`; the specification describes a **one-to-many** relationship (an opportunity may produce several decisions over time, with history).
- `Document` has no explicit `file_name` or `file_url`; the name must be derived from the stored file at render time.
- Several enumerated fields are unconstrained `CharField`s (for example gender, legal status, notification types) rather than the specified choice sets.
- `CallForProjects` has no status field, so a call cannot be distinguished from a closed one.
- `python-dotenv` is imported by `config/settings.py` but is **not listed in `requirements.txt`** — a clean install will fail at startup with `ModuleNotFoundError`.

---

## 6. Known defects

These are behavioural bugs, not missing features. They should be fixed before the app handles real data.

1. **`OpportunityViewSet` allows any authenticated user to create, update, and delete opportunities.** The permission class only requires authentication. Opportunity creation should be restricted to administrators.
2. **Funding, disbursement, and payment querysets are not scoped to the requesting user.** Any authenticated user who can guess an ID can read another organisation's funding records, disbursements, and payments. These querysets need `.filter(...)` on the caller's projects or organisation.
3. **`makemigrations --check --dry-run` gives a false negative** for the 12 apps missing initial migrations (see [§4](#4-running-the-project-locally)). This will silently pass in any pipeline that uses it.
4. **`python-dotenv` is a missing dependency** and will break a clean install.
5. **Access tokens are stored in `sessionStorage`**, where any injected script can read them, and the token is not refreshed: it expires after 10 minutes, after which every API call fails with 401, even though the backend issues refresh tokens. `sessionStorage` narrows the window to the tab rather than closing it, and the missing refresh flow is the larger half of the problem. Both need revisiting before handling real applications.
6. **`signOut()` only clears local state.** There is no logout endpoint, so a token cannot be revoked; the user believes they are signed out while the token remains valid until it expires.

---

## 7. Documentation conventions in this repository

- Every Python module opens with a docstring explaining its role, and every class, view, and serializer carries a comment describing what it does and how it relates to the specification.
- Gaps are documented **in place** with a `GAP:` comment rather than silently implemented, so the code always states its own limitations.
- The frontend follows the same convention, with file-level block comments and comments on the state, derived values, and event handlers.
- JSON files and the generated migration bodies cannot carry comments; migrations are documented by a header only, since Django regenerates them from the models.

---

## 8. Suggested order of work

1. Add `python-dotenv` to `requirements.txt`.
2. Generate the missing migrations and apply them; verify every app's tables exist.
3. Seed the four roles and implement role-aware permission classes.
4. Fix the three authorisation defects in [§6](#6-known-defects).
5. Add logout, token refresh, and the profile endpoint.
6. Build the role-adaptive `/dashboard` on the existing `components/ui/` primitives.
7. Replace the landing page's sample opportunities with a real query against `/api/opportunities/`.
8. Implement the `AuditLog` trail.
9. Add Celery tasks, then object storage.
10. Add `hooks/`, `services/`, and `types/`, and grow the catalogues alongside the new pages.
