# Wafa — Product Plan

## Implementation Progress (latest)

### Completed in this chat (Phase 1)
- Scaffolded app with latest Next.js (App Router), TypeScript, Tailwind
- Added PWA setup with `next-pwa` and app manifest
- Configured Supabase clients:
  - browser/client uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - server/API uses `SUPABASE_SECRET_KEY`
  - no legacy anon key usage
- Added `.env.local.example` template with required Supabase vars
- Added auth foundation:
  - `/signup`, `/login`, `/home`
  - `POST /api/profile/upsert`
  - `GET /api/auth/session`
  - `POST /api/auth/logout`
- Added Supabase middleware session refresh
- Added full initial SQL migration at `supabase/migrations/0001_init.sql`:
  - all enums, tables, indexes, constraints
  - triggers (`updated_at`, space/member constraints, attachment limits)
  - helper SQL functions for authorization checks
  - RLS enabled + policies across core tables
- Lint passed after implementation

### Pending before Phase 2 coding
- Create real `.env.local` from `.env.local.example` with actual keys
- Run migration against Supabase project (apply `supabase/migrations/0001_init.sql`)

### Next up (Phase 2)
- Spaces CRUD (1:1 + group)
- Invite link generation and one-time join
- Invite auth edge case flow:
  - store token in `sessionStorage`
  - auth redirect
  - post-auth auto-join and redirect to space
- Member list and admin remove-member flow

---

## App Identity

| Field | Value |
|---|---|
| Name | Wafa |
| Platform | PWA — installable from browser, no app store |
| Language | English (Urdu support planned for later) |
| Target users | Personal use — fiancée, close friends, family |

---

## Space Types

### 1:1 Space
- You + one other person
- Both members can create promises — creator owns it (can edit/delete)
- Either member can mark any promise as fulfilled regardless of who created it
- Both members can add notes and upload attachments to any promise
- Fully private — invisible to all other users
- Invite via one-time-use private link (you generate it)

### Group Space
- You (admin) + multiple members
- Admin generates invite links — one link per member (one-time use)
- Members can suggest promises — admin must approve before visible
- Members can add notes and attachments to approved promises only
- Members can see each other's names inside the group
- Members cannot invite others directly
- Group is invisible to anyone outside it

---

## Roles & Permissions

### 1:1 Space

"Own promise" = the member who created it. Assigned member does not affect ownership.

| Action | Creator | Other member |
|---|---|---|
| Create promise | ✓ | ✓ |
| Edit promise | ✓ | ✗ |
| Delete promise | ✓ | ✗ |
| Mark as fulfilled | ✓ | ✓ |
| Add notes | ✓ | ✓ |
| Upload attachments | ✓ | ✓ |
| Set reminders | ✓ | ✓ |

### Group Space
| Action | Admin | Member |
|---|---|---|
| Create promise | ✓ | Suggest only (pending approval) |
| Approve/reject suggestions | ✓ | ✗ |
| Edit any promise | ✓ | Own suggestions only |
| Delete any promise | ✓ | ✗ |
| Add notes to approved promises | ✓ | ✓ |
| Upload attachments to approved promises | ✓ | ✓ |
| Generate invite links | ✓ | ✗ |
| Remove members | ✓ | ✗ |
| Revoke invite links | ✓ | ✗ |
| See member list | ✓ | ✓ |
| Set reminders | ✓ | ✗ |

---

## Invite Link System

- One-time use: each link expires after the first person joins
- One link must be generated per member
- Removing a member immediately invalidates their link
- Removed member cannot rejoin unless given a brand new link
- Links stored in DB with status: `pending | used | revoked`

---

## Promises

### Fields
| Field | Required | Notes |
|---|---|---|
| Title | Yes | Short label |
| Description / note | No | Free text, editable, keeps edit history |
| Due date | No | Used for overdue computation |
| Assigned to | No | Self / all / specific member |
| Attachments | No | Up to 5 per promise |
| State | Auto | pending, fulfilled, overdue, snoozed |

### States
- `pending` — created, not yet fulfilled
- `fulfilled` — marked done by an assigned member
- `overdue` — computed on read: `due_at < now()`, no background job needed
- `snoozed` — user dismisses reminder temporarily

---

## Reminders

- Cadence options: Once · Daily · Weekly · Bi-weekly · Monthly · Every N days
- Custom cadence = "every N days at HH:MM" (e.g. every 3 days at 9:00 AM)
- No cron expressions exposed to users — keep it simple
- **v1 timezone: hardcoded to PKT (UTC+5)** — all users are based in Pakistan, no per-user timezone needed yet
- Timezone stored per user on signup (field present in DB for future use, defaulting to `Asia/Karachi`)
- Reminder notifies all relevant space members via web push
- Scheduled via Vercel cron jobs

### Timezone change behavior (v1)
- Not supported in v1 — all reminders fire in PKT
- Future: when timezone change is added, migrate all existing reminders to new timezone immediately

### Push Notification Fallback
- Web push is primary delivery method
- Fallback: in-app "Missed reminders" badge on home screen
- Badge shows all overdue promises in case push is blocked (common on iOS Safari)

---

## Attachments — Cloudflare R2

| Setting | Value |
|---|---|
| Storage provider | Cloudflare R2 |
| Free tier | 10 GB storage, zero egress fees |
| Estimated capacity | ~20,000 average photo attachments |
| Max per promise | 5 attachments |

### Allowed File Types & Limits
| Type | Max size |
|---|---|
| Images (jpg, png, webp) | 5 MB |
| Voice notes (mp3, m4a) | 10 MB |
| Documents (pdf) | 10 MB |
| Short video (mp4, ≤30s) | 30 MB |

### Upload Flow
1. Client requests upload via Supabase Edge Function
2. Edge Function generates a signed R2 upload URL (server-side only)
3. Client uploads directly to R2 using signed URL
4. On success, R2 object key saved to DB linked to the promise
5. R2 credentials never exposed to client

### Access Control
- All file access via signed URLs (TTL = 1 hour)
- URLs generated server-side via Supabase Edge Function
- URL refreshed on page load if expired
- Only space members can request signed URLs (enforced via RLS)

### Deletion
- Hard delete immediately — no recovery, no soft delete
- When a promise is deleted, its R2 objects are purged in the same operation

---

## Offline Sync

### What works offline
| Action | Offline support |
|---|---|
| View promises | ✓ cached locally via service worker |
| Add promise | ✓ queued in IndexedDB, syncs on reconnect |
| Mark fulfilled | ✓ queued in IndexedDB, syncs on reconnect |
| Add note | ✓ queued in IndexedDB, syncs on reconnect |
| Upload attachment | ✗ requires active connection |

### Sync Flow
1. User goes offline
2. Actions saved to IndexedDB queue locally
3. Service worker detects connection restored
4. Queue replays to Supabase in chronological order
5. Other space members receive real-time push update via Supabase Realtime

### Conflict Resolution
- Server `updated_at` is the source of truth — always set by Supabase, never by client
- On sync: if server `updated_at` is newer than the queued action's local timestamp, server wins
- Discarded local changes shown as a subtle UI toast: "This promise was updated by someone else"

---

## Privacy Model

- Spaces are never linked publicly — members of one space cannot discover other spaces exist
- A user who belongs to both your fiancée space and your family group has no way to tell both spaces belong to you
- Only admin can generate invite links — members cannot re-share or forward invites
- Members can see who else is in their shared space, but nothing outside it

---

## Deletions

- Hard delete only — no soft delete, no recovery
- Promises: deleted immediately from DB
- Attachments: R2 objects purged in same operation as promise deletion
- Members: removed from space immediately, invite link invalidated

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js latest (App Router) + TypeScript + Tailwind | PWA support, React ecosystem |
| PWA | next-pwa | Service worker, offline shell, installable |
| Offline queue | IndexedDB (via idb library) | Local action queue when offline |
| Backend / Auth | Supabase | Auth, Postgres, Realtime, Row Level Security |
| File storage | Cloudflare R2 | 10GB free, zero egress fees |
| Hosting | Vercel | Edge functions, cron jobs for reminders |
| Push notifications | Web Push API (via Supabase Edge Functions) | No app store needed |

---

## Supabase Free Tier Notes

- Free tier is sufficient for Wafa's personal use case permanently
- 50K MAU limit — Wafa will have ~5–20 users
- 500 MB DB — text rows only, will never be hit
- Supabase Storage not used — R2 handles all attachments

### Keep-alive cron (important)
Supabase free tier pauses projects after 7 days of inactivity (cold start ~10s).

Add a Vercel cron job at `/api/cron/ping` running every 3 days:
```ts
// app/api/cron/ping/route.ts
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  await supabase.from('spaces').select('id').limit(1)
  return Response.json({ ok: true })
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/ping",
      "schedule": "0 0 */3 * *"
    }
  ]
}
```

---

## Build Phases

### Phase 1 — Foundation
- Next.js latest project scaffold (App Router, TypeScript, Tailwind)
- next-pwa setup with service worker and offline shell
- Supabase project setup
- Auth: signup, login, session management, timezone stored on signup
- Status: completed

### Phase 2 — Spaces & Invite System
- 1:1 space creation
- Group space creation
- Invite link generation (one-time use, stored with status)
- Join via link flow
- Member list with roles
- Admin: remove member + invalidate link

### Phase 3 — Promises & Reminders
- Add / edit / delete promises
- Promise states: pending, fulfilled, overdue (computed), snoozed
- Notes on promises with edit history
- Reminder scheduling via Vercel cron
- Web push notifications + in-app missed reminders fallback

### Phase 4 — Attachments
- Cloudflare R2 bucket setup
- Server-side signed URL generation via Supabase Edge Function
- Upload flow: image, audio, PDF, video
- Attachment display in promise detail
- Hard delete cleanup on promise deletion

### Phase 5 — Offline Sync
- IndexedDB queue setup (idb library)
- Service worker background sync
- Conflict resolution with server timestamp
- Sync status indicator in UI (syncing / synced / conflict toast)

## Invite join flow (auth edge case)
If a user opens an invite link while not authenticated:
1. Store the invite token in sessionStorage
2. Redirect to /login or /signup
3. After successful auth, read token from sessionStorage
4. Auto-POST to /api/invites/:token/join
5. Redirect to the space — seamless experience

---

## Future (not in v1)
- Urdu language support
- Reaction / acknowledgement on fulfilled promises
- Promise history / activity log per space
- Multi-timezone support: per-user timezone with full migration of existing reminders on change