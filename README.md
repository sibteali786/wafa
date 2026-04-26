# Wafa

Wafa is a private, invite-only progressive web app (PWA) for people who care about each other to make and track promises together.

The app is designed for small trusted circles (for example, couples, close friends, and family), with strict privacy boundaries between spaces and lightweight reminder workflows.

## What this project is about

- **Promise tracking in private spaces**: users create commitments, track progress, add notes, and mark them fulfilled.
- **Two space types**:
  - `1:1` spaces (you + one other person)
  - `Group` spaces (admin + members with role-based permissions)
- **Invite-only membership**: one-time join links with revocation support.
- **PWA-first experience**: installable from browser, offline-friendly foundation, and push notification support.
- **Privacy by default**: users only see spaces they are members of; no public discoverability.

## Current implementation status

Implemented so far:

- Next.js app scaffold with App Router, TypeScript, and Tailwind
- PWA setup (`next-pwa`) + app manifest
- Supabase auth and session foundation
- Signup/login/home routes and auth API endpoints
- Supabase middleware and initial SQL migration
- shadcn/ui + React Hook Form + Zod setup
- Spaces and invite flows persisted (create/list/join with token hashing)
- Group member admin actions (member list, admin remove, removed-member screen)
- Promise lifecycle APIs and UI (create, fulfill/reopen, snooze/unsnooze, approve/reject)
- Notes with edit history + optimistic UI
- Reminder CRUD + picker sheet
- Attachments with Cloudflare R2 signed upload/download/delete APIs + promise detail grid
- Promise detail "more" actions for eligible users (edit + delete with confirmation)
- PKT-safe due date/time picker (date input + fixed time options, timezone-aware submit)

In progress next:

- Phase 2 suggestion lifecycle completion (member suggestion persistence + admin moderation parity)
- Attachment QA hardening (real-device validation, retry edge cases)
- Offline sync and conflict UX (Phase 5)

See `PLAN.md` for the complete product and technical roadmap.

## Latest updates

Use this template for each new session update:

```md
### YYYY-MM-DD

- **What shipped:** <feature/API/UI change>
- **Behavior impact:** <what users can do now>
- **Infra/data changes:** <migrations/env/dependency updates>
- **Verification:** <lint/tests/manual checks>
```

### 2026-04-23

- Closed Phase 2 member-admin gaps: group member list with role badges, admin remove flow, and removed-member state screen.
- Tightened invite revocation targeting using `invite_links.intended_for_user_id` via migration `0003_invite_intended_for.sql`.
- Shipped Phase 4 attachments foundation: R2 env wiring, signed upload/download/delete APIs, attachment grid/upload flow on promise detail, and best-effort R2 cleanup on promise delete.
- Added promise detail `⋯` actions for permitted users (1:1 creator, group admin): edit bottom-sheet flow + destructive delete confirmation flow.
- Replaced `datetime-local` due input with PKT-safe date + fixed-time picker and timezone-aware due date rendering.

### 2026-04-26

- **What shipped:** Completed infra R2 + migrations execution milestone: validated local env readiness, confirmed R2 bucket accessibility, verified migration parity (`0001`/`0002`/`0003`) and confirmed remote DB up to date.
- **Behavior impact:** Attachment and invite/member admin APIs are reachable with expected auth guards; R2 signed URL flow (upload/read/delete) works with current runtime credentials.
- **Infra/data changes:** No new schema added in this slice; verified existing migration artifacts are present in target Supabase schema including `invite_links.intended_for_user_id`.
- **Verification:** `npx supabase migration list`, `npx supabase db push`, schema presence checks via service-role client, endpoint auth-smoke checks, and R2 signed URL smoke script.

## Tech stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Forms/validation**: React Hook Form, Zod
- **Backend/Auth/DB**: Supabase (Postgres + RLS + Realtime)
- **Storage**: Cloudflare R2 (attachments)
- **Hosting**: Vercel
- **PWA/offline**: `next-pwa` + service worker + IndexedDB queue (planned)

## Local development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a local env file from the example:

```bash
cp .env.local.example .env.local
```

Populate required Supabase values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### 3) Apply database migrations

Run migrations in order in your Supabase project:

- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_note_history.sql`
- `supabase/migrations/0003_invite_intended_for.sql`

### 4) Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` — start development server
- `npm run build` — build for production
- `npm run start` — run production server
- `npm run lint` — run ESLint

## Product roadmap (high level)

- **Phase 1**: foundation (completed)
- **Phase 1.5**: UI foundation (completed)
- **Phase 2**: spaces + invite system
- **Phase 3**: promises + reminders
- **Phase 4**: attachments (Cloudflare R2)
- **Phase 5**: offline sync and conflict handling

## Notes

- v1 is currently optimized for English and PKT timezone (`Asia/Karachi`).
- This repository is actively evolving from a product plan into production-ready features.
