# Wafa — Product Plan

---

## Layout Rules — PERMANENT (apply to every page, every phase)

These rules must be followed for every new page built in any phase. They are non-negotiable and were established after Phase 1 to fix a mistake where pages were wrapped in a fake phone frame.

**Page structure — every authenticated and unauthenticated page:**
- Full viewport height: `min-h-screen bg-background` (`#fbf8f3`)
- Centered content column: `max-w-[480px] mx-auto w-full px-4`
- No `PhoneShell`, no phone frame wrapper, no fake status bar (9:41, signal icons, battery) — the user's real device already provides these
- Reference `app/home/page.tsx` and `app/login/page.tsx` as the correct pattern

**TabBar — shown/hidden by route:**

| Route | TabBar |
|---|---|
| `/home` | ✓ shown, Home active |
| `/spaces/[id]` | ✓ shown, Home active |
| `/reminders` | ✓ shown, Reminders active |
| `/me` | ✓ shown, Me active |
| `/spaces/new` and sub-routes | ✗ hidden — back button only |
| `/invite/[token]` | ✗ hidden |
| `/invite/continue` | ✗ hidden |
| `/login` | ✗ hidden |
| `/signup` | ✗ hidden |
| `/` (landing) | ✗ hidden |

**TabBar implementation:** `fixed bottom-0 left-0 right-0 z-50`, content inside also capped at `max-w-[480px] mx-auto`. Pages with TabBar must add `pb-[62px]` to their scroll container so content is not hidden behind it.

**ScreenHeader:** sits naturally at the top of the page flow — not fixed, not inside any wrapper. Back button on flows without TabBar. Settings/more icon on detail pages.

**FAB (floating action button):** `fixed bottom-[78px] right-4` (16px above the TabBar) on pages that need it (`/spaces/[id]`). Coral background, 52px circle, plus icon.

---

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

### Phase 1.5 — UI foundation (completed)
- **shadcn/ui** integrated with the existing Next.js + Tailwind v4 stack (`components.json`, `lib/utils.ts`, theme tokens in `app/globals.css`).
- **Forms:** React Hook Form + Zod for validation; shared form primitives in `components/ui/form.tsx` (with `@radix-ui/react-slot` for accessible control wiring).
- **Core UI primitives** under `components/ui/`: `button`, `input`, `label`, `card`, `dialog`, `dropdown-menu`, `select` (plus generated theme/CSS from the shadcn CLI).
- **Auth UI migrated** to shadcn + RHF + Zod: `components/auth-form.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`.
- **Landing / home** CTAs use shared button + card patterns: `app/page.tsx`, `app/home/page.tsx`.
- **Zod schemas (shared):**
  - `lib/schemas/space.ts` — `spaceFormSchema` (discriminated union: `one_to_one` vs `group` name rules).
  - `lib/schemas/invite.ts` — invite role / generate form shape for Phase 2.
- **Phase 2 UI stubs (not persisted yet):**
  - `components/space-form.tsx` — create-space form; `onSubmit` is ready to call Supabase insert.
  - `components/invite-dialog.tsx` — invite dialog with role select + stub URL; optional `onGenerate` for real API.
  - `components/home-spaces-phase2-stubs.tsx` — wires previews on `/home` (JSON preview + placeholder `spaceId` for invites).
- **Types:** `next-pwa.d.ts` declares `next-pwa` for TypeScript builds.

### Phase 2 — progress update (this chat)
- **Spaces APIs (persisted):**
  - `POST /api/spaces` creates `spaces` row and bootstraps creator membership in `space_members`.
  - Uses server-authenticated user + admin client writes; group creator gets `admin`, 1:1 creator gets `member` (matches DB constraints).
- **Invite APIs (hashed tokens):**
  - `POST /api/invites` generates raw token, stores only `sha256` hash in `invite_links`, returns `/invite/[token]` URL.
  - `POST /api/invites/[token]/join` verifies hash, inserts membership, marks invite `used` with `used_by/used_at`.
  - Shared helpers added in `lib/invites.ts`.
- **J05 flow routes added:**
  - `/spaces/new` type picker
  - `/spaces/new/1to1` (name + 4-color avatar picker + privacy note + CTA)
  - `/spaces/new/group` (group name + CTA)
- **J05 post-create first-visit state shipped on `/spaces/[id]`:**
  - 1:1: success/invite panel with dashed URL box + Copy/Share actions (share fallback to copy), waiting-state scaffolding
  - Group: prominent first-member invite CTA state
  - Implemented via `components/space-invite-panel.tsx`.
- **J06 `/spaces/[id]` baseline implemented:**
  - Header + crumb + more button
  - Segmented control (`Open`, `Fulfilled`, `All`) now implemented with interactive shadcn Tabs
  - 1:1 sections (overdue + pending) with fulfill icon affordance
  - Group-admin approval section with inline approve/reject UI affordances
  - Coral FAB + TabBar shown
- **Home non-empty state (J03) now real data-driven:**
  - `/home` now groups spaces into `1:1 spaces` and `Groups`
  - Overdue badges computed from promises
  - Header includes `+` entry to create space
- **Invite auth handoff implemented:**
  - `/invite/[token]` now validates invite and shows logged-out handoff UI when pending
  - Token is now stored server-side in HttpOnly cookie `wafa_invite_token` via `POST /api/invite/store-token`
  - `/invite/continue` now runs server-side, auto-joins, clears invite cookie, and redirects to `/spaces/[id]`
  - Auth forms use sanitized `next` redirects only (`sanitizeRedirect`) and continue to honor invite flow
- **Layout contract reinforcement for new Phase 2 pages:**
  - New routes built with full viewport pattern (`min-h-screen bg-background`, centered `max-w-[480px] mx-auto w-full px-4`)
  - No phone-frame wrapper used on newly introduced routes
- **Verification:**
  - Lint run after changes; edited app files pass (existing generated service-worker warnings remain in `public/`).

### Phase 3 — progress update (latest)
- **Promise APIs added:**
  - `POST /api/promises` (`app/api/promises/route.ts`) for create flow.
  - `PATCH`/`DELETE /api/promises/[id]` (`app/api/promises/[id]/route.ts`) for fulfill/reopen, snooze/unsnooze, approve/reject, and delete.
- **Create-promise flow from `/spaces/[id]` FAB:**
  - FAB now navigates to `/promises/new?spaceId=[id]`.
  - `/promises/new` built with required fields:
    - title (required), description (optional), due date (optional), assigned to (optional)
  - Reminder intentionally deferred to promise detail page.
- **`/spaces/[id]` UX pass completed:**
  - Full row body navigation to `/promises/[id]`.
  - Inline actions (fulfill, approve, reject) trigger API inline without navigation.
  - Action buttons stop bubbling (`preventDefault` + `stopPropagation`) to preserve row-nav behavior.
  - Snoozed bucket section added in 1:1 view.
  - Promise list tab logic moved to client component `components/space-detail-tabs.tsx` while keeping `app/spaces/[id]/page.tsx` server-rendered.
  - Tab behavior:
    - `Open`: overdue + pending + snoozed
    - `Fulfilled`: fulfilled list
    - `All`: overdue → pending → fulfilled → snoozed
  - Tabs styling aligned to wireframe:
    - `TabsList`: `rounded-lg bg-muted p-1`
    - Active trigger pill: `bg-card text-foreground rounded-md shadow-none`
    - Inactive triggers: `text-muted-foreground`
- **Promise detail + snooze action (J07/J06 dependency):**
  - `/promises/[id]` route added (no TabBar, back button only).
  - Snooze bottom sheet added with exactly:
    - `1 hour`, `Later today`, `Tomorrow`, `3 days`.
- **Note history migration + routes:**
  - `supabase/migrations/0002_note_history.sql` added (no edits to `0001_init.sql`).
  - Added `note_history` table and `promise_notes.edit_count`.
  - Added note history route `/promises/[id]/notes/[noteId]/history` (no TabBar).
- **Notes APIs with hard constraints implemented:**
  - `POST /api/promises/[id]/notes`
  - `PATCH`/`DELETE /api/promises/[id]/notes/[noteId]`
  - Edit flow writes to `note_history` **before** updating note body.
  - API enforces author-or-group-admin authorization explicitly.
  - Delete is hard delete; history cascade handled by `ON DELETE CASCADE`.
- **Notes optimistic UI (no reload pattern):**
  - Replaced `window.location.reload()` with local optimistic state updates in `components/promise-notes-panel.tsx`.
  - Create/edit/delete implement optimistic apply + rollback on failure + toast error feedback.
  - `edited N×` uses server-returned `edit_count` (not optimistic).
- **Reminder CRUD + picker sheet added:**
  - `POST /api/promises/[id]/reminders`
  - `PATCH`/`DELETE /api/promises/[id]/reminders/[reminderId]`
  - Reminder picker bottom sheet integrated on `/promises/[id]`.
- **Missed reminders fallback route implemented:**
  - `/reminders` now links to real fallback list.
  - `/reminders/missed` route added with TabBar active on Reminders.
- **Cron scope constraint implemented (Phase 3 only):**
  - `app/api/cron/reminders/route.ts` skeleton + scheduling algorithm only.
  - No Vercel cron config wiring and no Web Push API wiring yet.
- **Verification:**
  - Lint run after each major slice; touched files pass.

### Phase 3 — final polish update
- **Notes UX polish (optimistic + per-note concurrency):**
  - `components/promise-notes-panel.tsx` now uses local notes state with optimistic create/edit/delete behavior (no full-page reload).
  - Per-note in-flight tracking added (`pendingByNoteId`) so only the active note row is dimmed/disabled during its request; other notes stay interactive.
  - Create/edit rollback behavior preserved:
    - create failure removes optimistic temp note
    - edit failure restores previous note body
    - delete failure re-inserts removed note in prior position
- **Success toasts added (neutral variant, auto-dismiss):**
  - Notes:
    - `Note added`
    - `Note saved`
    - `Note removed`
  - Reminders:
    - `Reminder set`
    - `Reminder updated`
    - `Reminder removed`
  - Toasts use `WafaToast` neutral style; error cases remain coral style.
  - Auto-dismiss timer set to **2.5s**.
- **Server-driven ordering for notes:**
  - After create/edit success, notes are re-sorted by **server-returned** `updated_at` descending.
  - Most recently updated note appears at top.
  - `edited N×` display remains server-backed via `edit_count`.

### Phase 3 status
- **Status: completed** for the scoped Phase 3 requirements currently defined in this plan:
  - Promise CRUD/state transition APIs + UI wiring
  - Snooze action and snoozed bucket behavior
  - Note history migration/route/API constraints
  - Reminder CRUD + picker sheet
  - Missed reminders fallback route + cron skeleton-only handler
  - UX polish pass (per-note pending, success toasts, server-driven note ordering)

### Phase 2 + Phase 4 — progress update (this chat)
- **Phase 2 admin gaps closed (J09 behavior):**
  - Group member list now shown in `/spaces/[id]` with role badges (`admin` / `member`).
  - Admin-only member action sheet added with destructive remove + confirmation copy.
  - `DELETE /api/spaces/[id]/members/[userId]` added for remove-member flow.
  - Removed-member route behavior updated: `/spaces/[id]` now shows dedicated "You're no longer in this space" screen (not `notFound`) with CTA to `/home`.
  - Role visibility enforced: no member-management affordance for non-admins; no member-management UI in 1:1 spaces.
- **Invite revocation targeting tightened:**
  - New migration added at `supabase/migrations/0003_invite_intended_for.sql` to add `invite_links.intended_for_user_id`.
  - Invite create remains nullable for `intended_for_user_id`.
  - Invite join (`POST /api/invites/[token]/join`) now stamps `intended_for_user_id = joining user` when marking invite `used`.
  - Member removal now revokes only matching pending invites (`used_by = removed_user` or `intended_for_user_id = removed_user`), not all space invites.
- **Phase 4 attachments foundation + UI shipped:**
  - Added server-only R2 env handling (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) and placeholders in `.env.local.example`.
  - Added signed URL + object helper utilities (`lib/r2.ts`) and attachment validation rules (`lib/attachments.ts`).
  - New attachment APIs:
    - `POST /api/attachments/request-upload`
    - `POST /api/attachments/complete`
    - `GET /api/attachments/[id]/url`
    - `DELETE /api/attachments/[id]`
  - `/promises/[id]` attachment UI now includes:
    - 3-column grid
    - `Attachments · N/5` counter
    - add-slot upload flow (signed PUT -> direct upload -> complete)
    - optimistic upload progress + failed chip actions (retry/remove)
  - Promise delete path now performs best-effort R2 object cleanup before DB delete (`DELETE /api/promises/[id]`).
- **Verification:**
  - `npm run lint` passes with no errors in touched source files (existing generated service-worker warnings remain under `public/`).

### Promise detail + due-date UX update (this chat)
- **Promise detail more-actions sheet added (`/promises/[id]`):**
  - `⋯` button now opens a bottom sheet with:
    - `Edit promise`
    - `Delete promise`
    - `Cancel`
  - Edit opens inline bottom-sheet form using existing `PromiseCreateForm` in edit mode.
  - Delete opens confirmation sheet with permanent-delete warning copy and destructive confirm action.
  - On delete success, user is redirected back to `/spaces/[id]`.
- **Role-based action visibility enforced on promise detail:**
  - `Edit promise` + `Delete promise` shown only for:
    - 1:1 promise creator
    - group admin
  - Users without permission do not see the `⋯` control.
- **Due date/time input hardening (PKT-safe):**
  - Replaced `datetime-local` field with custom `DateTimePicker` (`components/wafa/date-time-picker.tsx`):
    - native `type="date"` input
    - fixed time select options (`06:00 AM` to `10:00 PM`)
    - default time `09:00 AM`
  - Submit now emits timezone-aware PKT ISO (`+05:00`) for deterministic server parsing.
  - Clearing date sets `dueAt = null`.
  - Promise detail due display now formats with explicit PKT timezone:
    - `toLocaleString("en-PK", { timeZone: "Asia/Karachi" })`
- **Verification:**
  - `npm run lint` rerun after these changes; no source-file lint errors.

### Auth security hardening update (this chat)
- **P0 — Redirect sanitization shipped:**
  - Added `sanitizeRedirect(next)` in `lib/utils.ts`.
  - Auth form navigation now uses sanitized internal-only redirect targets.
- **P1 — Invite token storage moved to HttpOnly cookie:**
  - Added `POST /api/invite/store-token` to validate token shape and set:
    - cookie: `wafa_invite_token`
    - flags: `HttpOnly`, `SameSite=Lax`, `Secure`, `Path=/`, `Max-Age=3600`
  - Removed client `sessionStorage` invite-token handling from runtime flow.
  - `/invite/continue` converted to server-side join flow with cookie cleanup on completion/failure.
- **P2 — Profile upsert auth model hardened:**
  - `POST /api/profile/upsert` now uses session-based auth (`createServerSupabaseClient` + `auth.getUser()`).
  - Removed bearer-token header dependency from the auth form caller.
- **Verification completed:**
  - Manual checks passed for redirect sanitization, invite join handoff, HttpOnly invite cookie behavior, and unauthenticated `401` from `/api/profile/upsert`.

### Infra R2 + migrations execution update (this chat)
- **Environment and storage readiness validated:**
  - Local `.env.local` includes required Supabase + R2 variables used by server runtime.
  - Cloudflare R2 bucket access verified with configured account + credentials (`HeadBucket` check passed).
- **Migrations applied/verified on target Supabase project:**
  - `npx supabase migration list` confirms local/remote parity for `0001`, `0002`, `0003`.
  - `npx supabase db push` reports remote database is up to date.
  - Schema smoke checks passed for:
    - `public.spaces` table
    - `public.note_history` table
    - `public.invite_links.intended_for_user_id` column
- **API/integration smoke checks completed:**
  - Attachment APIs (`request-upload`, `complete`, `[id]/url`, `[id] DELETE`) return expected unauthenticated `401` guards.
  - Invite/member admin APIs (`/api/invites/[token]/join`, `/api/spaces/[id]/members/[userId]`) return expected unauthenticated `401` guards.
  - R2 signed URL smoke flow passed end-to-end (`PUT` upload, `GET` readback, object delete).

### Phase 2 suggestion lifecycle update (this chat)
- **Moderation authorization hardened server-side:**
  - `PATCH /api/promises/[id]` now enforces that only **group admins** can run `approve` / `reject`.
  - Approve/reject now only applies to pending suggestions (`is_suggestion = true` and `approved_at is null`), preventing invalid transitions.
- **Group member suggestion UX finalized:**
  - Creating a suggestion now returns members back to `/spaces/[id]?suggested=1` instead of opening detail immediately.
  - `/spaces/[id]` shows a non-admin confirmation message: suggestion sent and awaiting admin review.
- **Home commitment counters aligned with product behavior:**
  - `/home` stats now exclude `is_suggestion = true` rows from open/overdue counts so unapproved suggestions do not appear as active commitments.
- **Verification:**
  - `npm run lint` passes for touched files (existing warnings in generated service-worker assets remain unchanged).

### Phase 4 retry hard-cap update (this chat)
- **Retry limit parity shipped in attachment upload UI:**
  - `components/promise-attachments-panel.tsx` now enforces strict max retry attempts (`3`) before manual retry.
  - Auto-retry path is blocked once attempts reach the cap; users see explicit manual fallback copy.
- **Manual retry fallback behavior added:**
  - Failed chips at cap now show `Try manually`, which starts a fresh upload cycle (new temp upload item, attempts reset to `1`).
  - Failed upload chips remain removable and non-blocking for normal promise flows.
- **Type safety fix included:**
  - Preview URL state update now uses a narrowed local constant (`previewUrl`) before `setPreviewUrls`, resolving `string | undefined` to `string`.
- **Verification:**
  - `npm run lint` passes for touched files.
  - `npx tsc --noEmit` confirms this file-level type issue is fixed (repo still has separate pre-existing type errors in other files).

### Phase 4 attachments QA update (this chat)
- **Supported file-class smoke checks passed (R2):**
  - End-to-end upload/open/delete validated for `image/jpeg`, `audio/mpeg`, `application/pdf`, and `video/mp4` using signed URLs.
- **Access-control smoke checks passed (multi-user RLS):**
  - Group member can insert/read attachment metadata on an approved group promise.
  - Outsider cannot read attachment metadata and cannot insert attachment rows for the promise.
  - QA fixtures (users/space/promise/attachment) were created and cleaned up in the same run.
- **Validation-rule parity confirmed (config-level):**
  - Allowed MIME list and size thresholds in `lib/attachments.ts` match product constraints.
- **Manual QA still required (device/browser matrix):**
  - Real-device verification for image/audio/pdf/video preview UX on mobile browsers.
  - Explicit oversize rejection UX and 5-attachment cap UX via authenticated UI path.

### Phase 5 sync status update (this chat)
- **Reconnect replay engine shipped (client-side):**
  - Added IndexedDB-backed replay executor for queued actions in `lib/offline/replay.ts`.
  - Added global `OfflineSyncProvider` (`components/offline/sync-status-provider.tsx`) wired in `app/layout.tsx`.
  - Provider listens to online/offline events, replays queued actions in deterministic order, and marks failures for retry.
- **Sync status UI states shipped:**
  - Added global top-right sync pill with states: `Offline`, `Queued`, `Syncing`, `Sync paused` (error), and hidden-on-idle `Synced`.
- **Action integration for queue + replay:**
  - `components/promise-create-form.tsx` queues `create_promise` when offline.
  - `components/promise-row-actions.tsx` queues `fulfill_promise` when offline.
  - `components/promise-notes-panel.tsx` queues `add_note` when offline.
- **Verification:**
  - `npm run lint` passes for touched files (existing generated-asset warnings unchanged).

### Phase 4 — next actions (immediate)
1. **Attachments QA final manual pass**
   - Validate upload/open/delete for image/audio/pdf/video across real devices.
   - Validate invalid type/oversize rejection UX (client + server responses) in authenticated flow.
   - Validate 5-attachment cap UX behavior in authenticated flow.

### Pending before continuing Phase 2
- Align older Phase 1 pages to the exact layout utility contract where still using legacy shell helpers

### Phase 2 — Implementation instructions (next)

**Goal:** Persist spaces and invites, complete join flows, and ship member admin actions. Reuse the Phase 1.5 components instead of rebuilding UI.

**Prerequisites**
- `.env.local` populated and migration `0001_init.sql` applied so `spaces`, `space_members`, and `invite_links` exist with RLS as defined.

**Suggested order**
1. **Create space (server or client + RLS)**  
   - On submit from `SpaceForm`, insert into `public.spaces` with `space_type` (`one_to_one` | `group`), `name` (nullable for 1:1 when empty), `created_by = auth.uid()`.  
   - Insert the creator into `public.space_members` as `admin` (required for group; for 1:1 you still need membership rules per product — align with triggers/constraints in migration).  
   - After success: redirect to `/spaces/[id]` or refresh `/home` and replace the JSON preview stub.

2. **List spaces**  
   - Query spaces the user belongs to via `space_members` (RLS already scopes reads to members). Replace the placeholder copy on `/home` with a real list.

3. **Invite links**  
   - Implement a route handler or server action that: creates a row in `invite_links` with a **hashed** token server-side, `intended_role`, `status = pending`, returns the public URL (e.g. `/invite/[token]` where the path uses the raw token once, store only hash in DB).  
   - Pass real `spaceId` into `InviteDialog` and implement `onGenerate` to call that API and set `inviteUrl` from the response.  
   - Enforce: only space admins can create invites (check `is_space_admin` / policies already in migration).

4. **Join via link**  
   - Page: `GET /invite/[token]` validates token, shows space summary; **Join** calls `POST` that verifies hash, inserts `space_members` if allowed, marks invite `used`, redirects to the space.  
   - **Auth edge case** (see also [Invite join flow](#invite-join-flow-auth-edge-case) below): if unauthenticated, store token in HttpOnly cookie (`wafa_invite_token`) via route handler, redirect to `/login` or `/signup`, then after auth `/invite/continue` auto-joins server-side and redirects to space.

5. **Members**  
   - Member list UI with roles.  
   - Admin: remove member (and revoke / invalidate pending invite for that member per product rules).

**Files to lean on**
| Area | Location |
|------|----------|
| Space form + validation | `components/space-form.tsx`, `lib/schemas/space.ts` |
| Invite UI + hook | `components/invite-dialog.tsx`, `lib/schemas/invite.ts` |
| Home previews (replace with real data) | `components/home-spaces-phase2-stubs.tsx`, `app/home/page.tsx` |
| Schema reference | `supabase/migrations/0001_init.sql` (`spaces`, `space_members`, `invite_links`) |

**Product checklist (from plan)**
- Spaces CRUD (1:1 + group) — create + list first; edit/delete if needed for v1.
- Invite link generation and **one-time** join (status `pending` → `used`).
- Invite auth edge case: HttpOnly invite cookie → auth → `/invite/continue` server auto-join → space.
- Member list with roles; admin remove member + invalidate relevant invite.

---

## Wireframe Review — Gaps & Additions

A wireframe deck (`Wafa_Wireframes_Deck.html`) covering 10 journeys was reviewed against this plan. Overall alignment is ~94%. The following gaps and additions must be implemented even though they are not yet wireframed.

### Missing screens — must be built

#### 1. `/invite/continue` — post-auth auto-join screen
The unauthenticated invite edge case is in the spec but not wireframed. When a user opens an invite link without being logged in:
- Show a minimal screen: space name preview + "You've been invited — sign up or log in to join"
- After auth, `/invite/continue` reads `wafa_invite_token` from server cookies, auto-calls join server-side, then redirects to the space
- On failure (used/revoked/invalid token): clear invite cookie, show same invalid-invite error screen as the authenticated flow, redirect to `/home`

#### 2. Missed reminders list screen — push notification fallback
The Reminders tab bell icon shows a notification dot but no list screen is wireframed. This is the in-app fallback when web push is blocked (common on iOS Safari).
- Route: `/reminders/missed`
- Shows all promises where `due_at < now()` and `state != fulfilled`, grouped by space
- Each row: promise title, space name, overdue duration (e.g. "2 days overdue"), tap opens promise detail
- Empty state: "You're all caught up" with a checkmark
- This screen is the primary fallback — it must work even when push notifications are fully disabled

#### 3. Snoozed promise state — UI missing
The `snoozed` state is in the DB schema and promise states list but no wireframe shows:
- How a snoozed promise looks in the space list (greyed out? separate section?)
- The snooze action — bottom sheet or inline picker for snooze duration (e.g. 1 hour, tomorrow, 3 days)
- How to un-snooze — button on the promise detail
- Snoozed promises should not show in the overdue count while snoozed

Implement as: snooze bottom sheet on promise detail (similar to the reminder picker sheet in J07), with options: 1 hour · Later today · Tomorrow · 3 days. Snoozed promises appear in a collapsed "Snoozed" section at the bottom of the space promises list.

#### 4. Note edit history screen
The promise detail wireframe shows "edited 2× history" as a tappable link but the history screen is not wireframed.
- Route: `/promises/:id/notes/:noteId/history`
- Shows a chronological list of note versions: timestamp, author, full text of that version
- Read-only — no restore action in v1
- Keep simple: monospace or plain text diff is fine, full rich diff not needed

#### 5. Profile / Me tab screen
The tab bar includes a "Me" tab in every screen but no screen is wireframed for it.
- Display name (editable)
- Email (read-only)
- Timezone (read-only in v1, shows "PKT — Asia/Karachi")
- Push notification permission status + "Enable notifications" button if blocked
- Log out button
- App version in footer (small, muted)

#### 6. Admin removes member — confirmation + feedback
The spec says removal immediately invalidates the member's invite link. No confirmation or result screen is wireframed.
- Tap member row in group → bottom sheet with "Remove from group" (destructive red) + Cancel
- Confirmation copy: "This will remove [Name] and invalidate their invite link. They cannot rejoin unless you send a new link."
- On success: member disappears from list, toast: "[Name] removed"

---

### Additions from wireframes — add to spec

These were in the wireframes but not in the original plan. Both are good UX and should be built.

#### Upload retry with attempt counter (Phase 4)
When an attachment upload fails (e.g. signed URL expired mid-upload):
- Show a failed chip on the attachment grid slot with a Retry / Remove action
- Track attempt count: `attempts: N · max 3 before manual`
- After 3 failed attempts, disable auto-retry and show "Upload failed — tap to try again manually"
- Failed uploads do not block the promise — the promise saves normally, attachment sits as retryable

#### "See my draft" on offline conflict (Phase 5)
When a queued offline action is discarded due to a server conflict:
- The conflict toast shows: "[Name] updated it first. Her version is live."
- Add two actions: "View latest" (opens current server version) and "See my draft" (shows the discarded local text)
- The discarded change is kept in IndexedDB under a `drafts` key (separate from the queue) so the user can reference it
- Draft is cleared when user explicitly dismisses it or after 7 days

---

### What the wireframes confirmed is correct
These decisions from the plan are correctly reflected in the wireframes — do not change them:
- 1:1 ownership rule shown as inline tip: "Only the creator can edit or delete it"
- Group member tip: "Only the admin can invite or remove members"
- Invite invalid screen uses vague copy covering used/revoked/expired — intentional for security
- Login error never reveals which field is wrong
- PKT timezone note shown in reminder sheet: "all times in PKT"
- Every N days cadence behind a secondary option to keep defaults clean
- Attachment counter 2/5 enforces the 5-attachment limit visually
- Offline sync: queued pill → syncing progress → conflict toast with server-wins resolution
- Hard delete: no undo, no soft delete, no recovery shown anywhere
- Overdue shown as computed badge, no background mutation

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
| Frontend | Next.js latest (App Router) + TypeScript + Tailwind + shadcn/ui | PWA support, React ecosystem; forms via React Hook Form + Zod |
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

### Phase 1.5 — UI foundation
- shadcn/ui, shared form primitives, auth + landing/home migrated, Phase 2 stubs (`SpaceForm`, `InviteDialog`)
- Status: completed (see [Implementation Progress](#implementation-progress-latest))

### Phase 2 — Spaces & Invite System
- **UI prep (done in Phase 1.5):** `SpaceForm`, `InviteDialog`, Zod schemas, `/home` stubs — wire these to Supabase and APIs (see [Phase 2 — Implementation instructions](#phase-2--implementation-instructions-next) above).
- 1:1 space creation (persist + bootstrap membership per migration rules)
- Group space creation
- Invite link generation (one-time use, stored with status; token hashed at rest)
- Join via link flow + [auth edge case](#invite-join-flow-auth-edge-case)
- Member list with roles
- Admin: remove member + invalidate link
- Status: **completed for current scoped requirements** (create/list/invite/join + member admin/remove + suggestion persistence/moderation lifecycle shipped)

### Phase 3 — Promises & Reminders
- Add / edit / delete promises
- Promise states: pending, fulfilled, overdue (computed), snoozed
- Notes on promises with edit history
- Reminder scheduling via Vercel cron
- Web push notifications + in-app missed reminders fallback
- Status: **completed for current scoped requirements** (including promise detail edit/delete UI and PKT-safe due-date input UX)

### Phase 4 — Attachments
- Cloudflare R2 bucket setup
- Server-side signed URL generation via Supabase Edge Function
- Upload flow: image, audio, PDF, video
- Attachment display in promise detail
- Hard delete cleanup on promise deletion
- Status: **in progress** (core APIs + UI + delete cleanup shipped; infra provisioning + final QA remain)

### Phase 5 — Offline Sync
- IndexedDB queue setup (idb library)
- Service worker background sync
- Conflict resolution with server timestamp
- Sync status indicator in UI (syncing / synced / conflict toast)

## Invite join flow (auth edge case)
If a user opens an invite link while not authenticated:
1. Store the invite token in HttpOnly cookie `wafa_invite_token` via `POST /api/invite/store-token`
2. Redirect to /login or /signup
3. After successful auth, load `/invite/continue` (server flow reads cookie)
4. Server auto-POSTs to `/api/invites/:token/join`
5. Clear invite cookie and redirect to the space — seamless experience

---

## Future (not in v1)
- Urdu language support
- Reaction / acknowledgement on fulfilled promises
- Promise history / activity log per space
- Multi-timezone support: per-user timezone with full migration of existing reminders on change