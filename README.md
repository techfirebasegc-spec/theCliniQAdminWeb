# theCliniQAdminWeb

The CliniQ **Platform Admin** web application — a private operations workspace used by
platform administrators to manage the CliniQ platform (clinics, doctors, owners,
applications, invitations, and public-discovery approvals).

The app is a [Next.js](https://nextjs.org) App Router project (Next 16, React 19,
TypeScript) that runs on port **3001**.

> This is an internal tool. It is not indexed (`robots: noindex, nofollow`) and is not
> intended for public access.

## Features

The admin shell (`src/components/admin-shell.tsx`) exposes three navigation groups:

**Organizations**
- **Clinics** — list, create (`/platform/clinics/new`), and view clinics (`/platform/clinics/[clinicId]`).
- **Clinic Applications** — review and act on clinic applications.
- **Clinic Owners** — manage tenant owners.
- **Invitations** — issue and track clinic-owner invitations.

**Doctors**
- **Doctors / Verification** — list doctors, view details, and manage professional verification.
- **Doctor Applications** — review and act on doctor applications.
- **Doctor Invitations** — issue and track doctor invitations.

**Dashboard**
- An overview of platform activity.

Additional routes:
- `/login`, `/sign-up` — email authentication.
- `/accept-invitation` — tenant-owner onboarding.
- `/employees`, `/appointments`, `/services` — tenant-scoped views.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19, hand-authored CSS (`app/globals.css`) |
| Language | TypeScript 5.9 |
| Auth | Firebase Auth (client) + CliniQ Platform API sessions (cookie) |
| Lint | ESLint 9 (`eslint-config-next`) |

## Getting started

### Prerequisites

- Node.js 24 (or a current LTS release)
- A running instance of the CliniQ Platform API (see `CliniQPlatform`)

### Install

```powershell
pnpm install
```

### Configure environment

Copy `.env.example` to `.env.local` and provide values for:

- `NEXT_PUBLIC_PLATFORM_API_BASE_URL` — base URL of the CliniQ Platform API.
- `NEXT_PUBLIC_FIREBASE_*` — Firebase web config (`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`,
  `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`, `MEASUREMENT_ID`).

Do not commit `.env.local`.

### Run

```powershell
pnpm dev      # http://localhost:3001
pnpm build    # production build
pnpm lint     # eslint
pnpm typecheck
```

## Project structure

```
app/                        Next.js App Router routes
  layout.tsx                Root layout + AuthProvider
  page.tsx                  Redirects to /platform
  login/ sign-up/ accept-invitation/   Auth & onboarding flows
  platform/                 Platform admin console (clinics, doctors, applications, ...)
  dashboard/ appointments/ employees/ services/   Tenant-scoped views
src/
  components/               UI (admin shell, console, read pages, forms)
  providers/auth-provider   Firebase auth + session state
  lib/firebase.ts           Firebase app/auth initialization
  lib/platform-api/         Typed Platform API client (client, auth, admin, platform-admin)
  lib/data/                 Dashboard data access + types
```

## API integration

All server calls go through the CliniQ Platform API via
`src/lib/platform-api/client.ts` (`platformRequest` / `platformPost` / `platformDownload`).
Requests are sent with `credentials: "include"` so the API session cookie is used.
Errors are surfaced as `PlatformApiError` (with `status`, `code`, and `requestId`).

## Related projects

- `CliniQPlatform` — API, database, and shared packages.
- `theCliniQProviderWeb` — clinic/doctor provider portal.
- `theCliniQPatientWeb` — public patient-facing site.

## Individual context and system boundaries

This repository is the administrative frontend. The separate Platform API implements entitlement checks, sessions, business rules and database access; hiding a control in this frontend is not authorization. Tenant-scoped views and Platform Admin operations have different contexts, and access depends on API authorization.

| Related repository | Relationship |
| --- | --- |
| [CliniQPlatform](https://github.com/techfirebasegc-spec/theCliniQPlatform) | Backend for admin and tenant sessions, administrative endpoints and platform data. |
| [theCliniQPatientWeb](https://github.com/techfirebasegc-spec/theCliniQPatientWeb) | Public/patient application consuming the same platform's public and patient API. |
| [theCliniQProviderWeb](https://github.com/techfirebasegc-spec/theCliniQProviderWeb) | Separate clinic/doctor workspace. |
| [theCliniQDocPortal](https://github.com/techfirebasegc-spec/theCliniQDocPortal) | Separate documentation portal; it checks Platform Admin eligibility through the Platform API and maintains its own portal session and database. |

The admin API client exchanges Firebase tokens through `/v1/auth/admin/firebase/session`; its tenant session flow uses `/v1/auth/tenant/firebase/session`. The frontend sends API requests with credentials. Actual data visibility and permissions are determined by the API and the user's context.

## Repository and deployment notes

- Local directory: `D:\project\theCliniQAdminWeb`; repository: [techfirebasegc-spec/theCliniQAdminWeb](https://github.com/techfirebasegc-spec/theCliniQAdminWeb).
- The project has its own `app/`, `src/`, `public/`, configuration and lockfiles. Its package scripts define `dev`, `build`, `lint`, and `typecheck`; there is no package-level `test` or `start` script.
- Keep local environment files and credentials out of Git. API base URL, Firebase settings, cookie behavior and CORS must be appropriate for each environment.
- Production service, hostname, port, deployment path and rollback process must be verified separately. `projectarchitecture.md` describes cross-project context but is not evidence of current VPS state.
