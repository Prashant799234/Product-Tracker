# Product Tracker

An internal ops task tracker for the 3-person team at Lightstorm. Tracks tasks
across quarters with severity, status, progress, ownership, escalations,
to-dos, comments, and a full audit trail — backed by Postgres (Neon) and
deployed on Vercel.

This is a real, working app: Postgres-backed data via Drizzle ORM, real
email+password authentication (JWT sessions, bcrypt-hashed passwords,
invite-only accounts), and server-enforced role-based access control. There
is no mock data layer and no public signup — every account is created by an
existing teammate.

## Tech stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS, with hand-rolled UI primitives in `components/ui/` (in the
  shadcn/ui style) built on Radix primitives
- `drizzle-orm` + `drizzle-kit`, using the `@vercel/postgres` driver so it
  works against a Neon-backed Vercel Postgres database
- `bcryptjs` for password hashing, `jose` for JWT signing/verification
  (works in both the Node API routes and the Edge middleware), `zod` for
  input validation

## Data model

See `lib/db/schema.ts` for the full schema: `users`, `tasks`, `task_links`,
`task_documents`, `task_todos`, `task_comments`, `task_events` (the
auto-generated audit trail — every mutating action writes an event
server-side), and `shares` (per-viewer dashboard/module read access grants).

Documents and supporting links are **external URL references only** — there
is no file upload / object storage in this app. Point them at wherever the
real file already lives (Drive, Confluence, Figma, etc).

Authentication is **plain email + password, invite-only** — there is no SSO,
OAuth, or public self-signup route. New accounts can only be created by an
already-authenticated user with `can_manage_users = true`, and only for
`@lightstorm.in` email addresses.

## Local setup

1. **Create a Postgres database.** Either:
   - In the Vercel dashboard, open your project's **Storage** tab and add a
     Postgres (Neon) integration — this provisions a Neon database and
     injects `POSTGRES_URL` for you automatically when deployed, or
   - Create a free project directly at [neon.tech](https://neon.tech) and
     copy its connection string.

2. **Configure environment variables.**

   ```bash
   cp .env.example .env.local
   ```

   Fill in:
   - `POSTGRES_URL` — the Neon/Postgres connection string from step 1.
   - `AUTH_SECRET` — a random secret used to sign session JWTs. Generate one
     with `openssl rand -base64 32`.

3. **Install dependencies.**

   ```bash
   npm install
   ```

4. **Create the database tables.**

   ```bash
   npm run db:push
   ```

5. **Seed the 3 team accounts** (idempotent — safe to re-run; also adds a
   few clearly-fake sample tasks so the UI isn't empty, unless you pass
   `--no-sample-data`):

   ```bash
   npm run db:seed
   ```

   This prints each account's temporary password to the console **once**.
   Share these with Ankur and Harshit out-of-band (Slack/WhatsApp — never
   commit them anywhere). Every seeded account has `must_change_password`
   set, so each person is forced to set their own password on first login.

6. **Run the dev server.**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`, sign in with one of the seeded accounts,
   and set a new password when prompted.

## Deploying

1. Push this repo to GitHub (already wired to
   `Prashant799234/Product-Tracker`):

   ```bash
   git push origin main
   ```

2. Import the repo in Vercel.
3. Add the Postgres storage integration in the Vercel dashboard (this sets
   `POSTGRES_URL` for you), or set `POSTGRES_URL` and `AUTH_SECRET` manually
   under Project Settings → Environment Variables.
4. Deploy. Then, from your local machine (pointed at the same
   `POSTGRES_URL`), run `npm run db:push` and `npm run db:seed` once against
   the production database to create tables and the 3 accounts.

## RBAC summary

- **admin** (Ankur): full CRUD on everything, full user management, can
  resolve any escalation.
- **member** (Prashant, Harshit): can create tasks; can edit a task's core
  fields only when they created it or are assigned to it (otherwise
  read-only, except comments — anyone can always comment on any task they
  can see); can manage plain `viewer` accounts but not another admin/member's
  role or active status; can raise escalations on tasks they can edit and
  resolve only the ones they raised.
- **viewer**: fully read-only, scoped by `shares` grants (whole-dashboard or
  a specific module); can always comment; cannot create/edit tasks or see
  User Management.

Every rule above is enforced **server-side** in the API route handlers (see
`lib/permissions.ts` and `lib/auth.ts`), not just hidden in the UI. Every API
route independently re-verifies the session cookie and re-checks
`token_version` / `is_active` against the database, so a forced logout
(bumping `token_version`) or deactivating an account invalidates existing
sessions immediately, even though the JWT itself would otherwise still be
valid until it expires.

## Project structure

- `app/` — pages (`/login`, `/change-password`, `/` dashboard,
  `/tasks/[id]`, `/users`) and API routes (`app/api/**`)
- `components/ui/` — minimal Tailwind + Radix UI primitives
- `components/dashboard/`, `components/tasks/`, `components/users/` — feature
  components
- `lib/db/` — Drizzle schema, DB client, and the seed script
- `lib/auth.ts` — session signing/verification, password hashing
- `lib/permissions.ts` — RBAC rules shared across API routes
- `middleware.ts` — Edge-safe route guard (redirects unauthenticated page
  loads to `/login`; does not itself authorize API calls)
