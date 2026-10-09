# The CliniQ — Project Architecture

Full system architecture for The CliniQ platform: how the API connects to the database,
how each web application connects to the API, and how the pieces relate to each other.

> Scope of this document: cross-project architecture. The diagram below covers **all four
> repositories** (`theCliniQAdminWeb`, `theCliniQProviderWeb`, `theCliniQPatientWeb`,
> `CliniQPlatform`). The same file is placed in each project folder.

## High-level system diagram

```
                                  ┌───────────────────────────────────────────────┐
                                  │                    USERS                        │
                                  │  Platform Admin · Clinic Staff · Doctors ·      │
                                  │  Patients / Public Visitors                     │
                                  └───────────────────────────────────────────────┘
                                        │               │               │
              ┌─────────────────────────┘               │               └───────────────────────────┐
              │                                          │                                          │
              ▼                                          ▼                                          ▼
  ┌────────────────────────┐               ┌────────────────────────┐              ┌──────────────────────────┐
  │   theCliniQAdminWeb    │               │  theCliniQProviderWeb  │              │   theCliniQPatientWeb     │
  │   (Next.js, :3001)     │               │   (Next.js, :3002)     │              │   (Next.js, :3000)        │
  │                        │               │                        │              │                           │
  │  Platform Admin console│               │  Clinic + Doctor portal│              │  Public site + discovery  │
  │  - clinics / doctors   │               │  - services / versions │              │  - doctors / clinics      │
  │  - applications        │               │  - availability        │              │  - services / content     │
  │  - invitations         │               │  - appointments        │              │  - join-us applications   │
  │  - discovery approvals │               │  - verification        │              │  - booking handoff        │
  └───────────┬────────────┘               └───────────┬────────────┘              └────────────┬─────────────┘
              │                                        │                                        │
              │  Firebase Auth (client SDK)            │  Firebase Auth (client SDK)            │  Firebase Auth (client SDK)
              │  + Platform API session cookie         │  + Provider API session cookie         │  + Platform API session cookie
              │                                        │                                        │
              └───────────────────────┬────────────────┴───────────────────┬────────────────────┘
                                      │        HTTPS / JSON (credentials: include, CORS)
                                      ▼
                     ┌──────────────────────────────────────────────────────────────┐
                     │                  CliniQPlatform — REST API                     │
                     │                     @cliniq/api · Fastify 5                   │
                     │                     host 127.0.0.1 · port 4000                │
                     ├──────────────────────────────────────────────────────────────┤
                     │  Routes (api/src/routes) → Modules/Services (api/src/modules)  │
                     │                                                                │
                     │  Auth & sessions   │ sessions, identity, provider-auth,       │
                     │                    │ admin-auth, tenant-owner-onboarding       │
                     │  Directory         │ public-discovery, profiles, clinics,      │
                     │                    │ memberships, network, provider-portal     │
                     │  Services          │ service-offerings, availability,          │
                     │                    │ service-exposures, clinic-service-doctors │
                     │  Booking           │ appointment-intents, delegated-bookings,  │
                     │                    │ appointment-operations, reschedules,      │
                     │                    │ cancellations                             │
                     │  Payments          │ financial (Razorpay), payment-handoffs,   │
                     │                    │ payment-order-provisioning, webhooks      │
                     │  Clinical          │ chat (appointment), prescriptions, files  │
                     │  Governance        │ admin-access, admin-read, platform-admin, │
                     │                    │ doctor-verification, applications, audit  │
                     ├──────────────────────────────────────────────────────────────┤
                     │  Cross-cutting: helmet · CORS · request-id · pino logging ·   │
                     │  error handler · session TTL policy                            │
                     └───────┬──────────────────────┬──────────────────────┬─────────┘
                             │                      │                      │
                             ▼                      ▼                      ▼
              ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────────┐
              │   PostgreSQL 17    │   │      Redis 7       │   │  External services     │
              │  (system of record)│   │   (sessions/cache) │   │                        │
              │                    │   │                    │   │  • Firebase Admin SDK  │
              │  host 127.0.0.1    │   │  host 127.0.0.1    │   │    (token verification)│
              │  port 5432         │   │  port 6379         │   │  • Razorpay (payments, │
              │  db cliniq_platform│   │                    │   │    webhooks, refunds)  │
              │                    │   │  (ioredis)         │   │  • AIC S3 storage      │
              │  node-pg-migrate   │   │                    │   │    (verification docs, │
              │  migrations        │   │                    │   │    file metadata)      │
              └────────────────────┘   └────────────────────┘   └────────────────────────┘
```

## Data flow summary

| Path | Flow |
| --- | --- |
| Sign-in (all apps) | Client Firebase Auth → ID token → `POST /v1/auth/.../firebase/session` (or provider/admin variants) → API verifies token with Firebase Admin → API issues HTTP-only session cookie |
| Request (all apps) | Browser sends cookie (`credentials: "include"`) → API resolves session + tenant context → authorization → Postgres query → JSON response |
| Public discovery | Patient Web (server components) → `GET /v1/public/*` → API → Postgres read-only projection of published doctors/clinics/services |
| Booking | Patient Web → `POST /v1/appointment-intents` (+ `/reserve`, `/payment-handoffs`) → API → Postgres; payment via Razorpay → webhook `razorpay-webhooks` confirms → Postgres |
| Provider ops | Provider Web → `/v1/provider/*` and `/v1/me/*` → API modules → Postgres; audit trail recorded |
| Admin ops | Admin Web → `/v1/admin/*` and `/v1/platform-admin/*` → API modules → Postgres; entitlement-gated |

## Application-to-API connection detail

| Application | Dev port | API base env var | Primary API surface | Docs shipped |
| --- | --- | --- | --- | --- |
| `theCliniQAdminWeb` | 3001 | `NEXT_PUBLIC_PLATFORM_API_BASE_URL` | `/v1/admin/*`, `/v1/platform-admin/*`, `/v1/auth/admin/*` | `README.md`, `projectarchitecture.md` |
| `theCliniQProviderWeb` | 3002 | `NEXT_PUBLIC_PLATFORM_API_BASE_URL` | `/v1/provider/*`, `/v1/me/*`, `/v1/service-offerings`, `/v1/service-exposures`, `/v1/availability` | `README.md`, `projectarchitecture.md` |
| `theCliniQPatientWeb` | 3000 | `NEXT_PUBLIC_PLATFORM_API_BASE_URL` | `/v1/public/*`, `/v1/me/clinic-application`, `/v1/me/doctor-profile*`, `/v1/appointment-intents/*` | `README.md`, `projectarchitecture.md` |
| `CliniQPlatform` (API) | 4000 | `API_PORT` / `API_HOST` | Serves all of the above; owns Postgres + Redis | `README.md`, `projectarchitecture.md`, `docs/*` |

## CliniQPlatform monorepo internals

`CliniQPlatform` is a pnpm workspace containing the API, the future web shell, shared
packages, database migrations, and infrastructure:

```
CliniQPlatform/
  api/                 @cliniq/api — Fastify REST API (routes → modules → repositories)
  web/                 @cliniq/web — Next.js web shell
  packages/contracts/  @cliniq/contracts — shared types/contracts
  packages/config/     @cliniq/config — shared configuration
  database/            migrations (node-pg-migrate) + seeds
  infrastructure/      docker/compose.yml (local Postgres + Redis)
  Dockerfile           production API image
  docker-compose.local.yml / docker-compose.production.yml
  docs/                architecture, domain model, migration plans, verification
```

Layering inside the API:

```
routes/* (HTTP)  →  modules/*/*.ts (services, business rules, authorization)
                 →  modules/*/postgres-*-repository.ts (data access)
                 →  infrastructure/database.ts (pg pool)
                 →  PostgreSQL
```

## Environments & networking

- **Local development**
  - Postgres `127.0.0.1:5432` (db `cliniq_platform`) and Redis `127.0.0.1:6379` via
    `infrastructure/docker/compose.yml`.
  - API listens on `127.0.0.1:4000`.
  - Web apps on 3000 / 3001 / 3002.
- **Production**
  - API runs as a container (`ghcr.io/techfirebasegc-spec/cliniq-api`) listening on
    `0.0.0.0:4000`, exposed only on `127.0.0.1:4000` behind a reverse proxy.
  - Env from `/etc/cliniq/api.env`; Firebase admin credentials mounted read-only as a secret.
  - Health check via `GET /ready`.

## CORS & session model

- The API enables CORS for the configured web origin(s) with `credentials: true`
  (`browserOrigins(environment.WEB_URL)`).
- All three web apps call the API with `credentials: "include"`, relying on the API-issued
  HTTP session cookie (short idle TTL + absolute TTL).
- Firebase is used only for identity; authorization is enforced by the API using tenant
  memberships, platform-admin entitlements, and provider access checks in Postgres.
