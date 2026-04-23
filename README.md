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
- Phase 2 UI stubs for spaces and invites (wired UI, persistence pending)

In progress next:

- Persisted spaces and invite flows
- Member management actions
- Promise lifecycle, reminders, attachments, and offline sync

See `PLAN.md` for the complete product and technical roadmap.

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

### 3) Apply database migration

Run the initial migration in your Supabase project:

- `supabase/migrations/0001_init.sql`

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
