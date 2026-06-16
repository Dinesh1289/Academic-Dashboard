# Academic Performance Dashboard — Sprint 1

Internal operations dashboard for monitoring student and mentor performance, synced from Edmingle LMS.

**Sprint 1 scope only.** No leaderboard, no CSV import, no project evaluation. See [Sprint 1 Scope](#sprint-1-scope) below.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Deployment | Vercel |

---

## Prerequisites

- Node.js 20+
- A Supabase project ([supabase.com](https://supabase.com) — free tier is sufficient)
- Edmingle API credentials (`apikey` + `ORGID`)
- (Optional) Supabase CLI for migrations: `npm install -g supabase`

---

## 1. Installation

```bash
git clone <your-repo-url>
cd academic-performance-dashboard
npm install
```

---

## 2. Environment Variables

Copy the template and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API (⚠️ keep secret, server-only) |
| `EDMINGLE_API_KEY` | Provided by Edmingle / your LMS admin |
| `EDMINGLE_ORG_ID` | Provided by Edmingle / your LMS admin |
| `EDMINGLE_BASE_URL` | Edmingle API base URL (confirm with Edmingle docs) |
| `CRON_SECRET` | Generate any random 32+ char string: `openssl rand -hex 32` |

**Never commit `.env.local`.** It is already in `.gitignore`.

---

## 3. Database Setup

### Option A — Supabase CLI (recommended)

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies all files in `supabase/migrations/` in order.

### Option B — Manual via SQL Editor

1. Open Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/001_initial_schema.sql`
3. (Optional, dev only) Run `supabase/migrations/002_seed_dev_data.sql` for sample data

### Option C — Script runner

```bash
# Requires SUPABASE_DB_URL in .env.local (Project Settings → Database → Connection String)
npm run db:migrate
```

---

## 4. Create Your First Admin User

Sprint 1 does not include a user management UI. Create the first admin manually:

1. **Create the Supabase Auth user:**
   Supabase Dashboard → Authentication → Users → Add User
   Enter an email and password. Copy the generated **User UID**.

2. **Link it to the `users` table:**
   Run this in the SQL Editor (replace placeholders):

   ```sql
   INSERT INTO users (supabase_uid, email, full_name, role)
   VALUES ('<paste-user-uid-here>', 'admin@yourcompany.com', 'Admin User', 'admin');
   ```

3. Repeat for `academic_team` and `support_team` test users as needed, changing the `role` value.

4. **Important:** also set the role in Supabase Auth's `app_metadata` so the middleware can read it without a DB round-trip:

   Supabase Dashboard → Authentication → Users → select user → Edit → User Metadata → set:
   ```json
   { "role": "admin" }
   ```
   (This is also handled automatically once you implement the `POST /api/auth/sync-role` helper in Sprint 2; for Sprint 1, set it manually for each user you create.)

---

## 5. Local Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) → redirects to `/login`.

Log in with the admin credentials created in step 4.

---

## 6. Running a Sync

### Via UI
Log in as `admin` → Dashboard → click **"Sync Now"**.

### Via CLI (for testing without the UI)

```bash
npm run sync:manual                # full sync, all 8 modules
npm run sync:manual -- students    # sync only the students module
```

### Via API directly

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Cookie: <your-session-cookie>"
```

---

## 7. Nightly Cron (Production)

Sprint 1 ships a **cron placeholder**. The endpoint exists (`/api/cron/sync`) and is wired into `vercel.json` to run nightly at 2:00 AM UTC. It is protected by `CRON_SECRET`.

Vercel automatically calls this endpoint on schedule once deployed — no extra setup needed beyond setting `CRON_SECRET` in your Vercel project's environment variables.

To test the cron endpoint manually:

```bash
curl http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer <your-CRON_SECRET-value>"
```

---

## 8. Deployment (Vercel)

```bash
npm install -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add EDMINGLE_API_KEY
vercel env add EDMINGLE_ORG_ID
vercel env add EDMINGLE_BASE_URL
vercel env add CRON_SECRET
vercel --prod
```

Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to your production domain after first deploy.

---

## Sprint 1 Scope

### ✅ Included
- Project setup (Next.js 15 + TypeScript + Tailwind + shadcn-style components)
- Authentication (Supabase Auth, email/password)
- RBAC — 3 roles: `admin`, `academic_team`, `support_team` (middleware-enforced)
- Database schema — 11 tables: `roles`, `users`, `students`, `mentors`, `courses`, `batches`, `enrollments`, `attendance`, `assessments`, `feedback`, `sync_logs`
- Edmingle integration layer — client, mapper, sync engine (7 sync modules)
- Manual sync button + nightly cron placeholder
- Retry logic, exponential backoff, timeout handling, error logging — all implemented in `src/lib/edmingle/client.ts`
- Dashboard shell — `/login`, `/dashboard`, `/courses`, `/students`, `/mentors`
- Placeholder KPI cards (real DB counts, no derived analytics)

### ❌ Explicitly NOT in Sprint 1 (deferred)
- Leaderboard logic / score calculations
- Project Evaluation CSV import module
- Analytics or trend calculations
- Notifications (email/WhatsApp)
- Audit logs UI
- Student/batch editing
- User management UI (use Supabase Dashboard directly for Sprint 1)

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/              # Public login page
│   ├── (dashboard)/                # Authenticated shell
│   │   ├── dashboard/              # Overview KPIs
│   │   ├── courses/                # Course list
│   │   ├── students/               # Student list
│   │   └── mentors/                # Mentor list (admin + academic_team only)
│   └── api/
│       ├── dashboard/overview/     # GET KPI data
│       ├── courses/                # GET course list
│       ├── students/               # GET student list
│       ├── mentors/                # GET mentor list (RBAC protected)
│       ├── sync/                   # POST trigger sync, GET sync status
│       └── cron/sync/              # Nightly cron endpoint
├── components/
│   ├── layout/                     # Sidebar, Header
│   ├── dashboard/                  # Dashboard-specific client components
│   └── shared/                     # Reusable: DataTable, KPICard, SearchBar, etc.
├── lib/
│   ├── supabase/                   # client.ts, server.ts, admin.ts
│   ├── edmingle/                   # client.ts (HTTP + retry), mapper.ts
│   ├── sync/                       # engine.ts — sync orchestration
│   ├── repositories/               # Data access layer (one per entity)
│   ├── services/                   # Business logic layer
│   └── validators/                 # env.ts, rbac.ts
├── middleware.ts                   # Route protection
└── types/                          # Shared TypeScript types

supabase/
└── migrations/
    ├── 001_initial_schema.sql
    └── 002_seed_dev_data.sql       # Dev-only sample data

scripts/
├── manual-sync.js                  # CLI sync trigger
└── run-migrations.js               # Migration runner (alt to Supabase CLI)
```

---

## Architecture Notes

- **Repository Pattern**: All DB queries live in `src/lib/repositories/*`. No raw Supabase calls in components or API routes.
- **Service Layer**: Business logic in `src/lib/services/*`, sitting between API routes and repositories.
- **RBAC**: Enforced twice — once in `middleware.ts` (route-level redirect, fast/coarse) and once in `src/lib/validators/rbac.ts` (`requireAuth()` used inside every API route, fine-grained and authoritative). Never rely on the frontend alone.
- **Edmingle Sync**: `EdmingleClient` (raw HTTP + retry/backoff) → `mapper.ts` (shape transformation) → `engine.ts` (orchestration, upserts, cursor management, sync_logs).
- **Strict TypeScript**: `strict: true` and `noUncheckedIndexedAccess: true` enabled in `tsconfig.json`.

---

## Troubleshooting

**"Invalid environment variables" on startup**
Check `.env.local` against `.env.example` — all server vars in `src/lib/validators/env.ts` are validated at runtime via Zod.

**Login succeeds but redirected back to /login**
The `users` table row is missing or `supabase_uid` doesn't match. Re-check step 4.

**Mentors page redirects to dashboard**
Expected behavior for `support_team` role — this is RBAC working as designed.

**Sync fails immediately with 401**
`EDMINGLE_API_KEY` or `EDMINGLE_ORG_ID` is incorrect. Verify with your Edmingle admin.

**Sync fails with "unknown course_id" on batches**
Courses must sync before batches. The sync engine runs modules in the correct order automatically (`courses → mentors → batches → students → ...`) — only an issue if you ran `sync:manual -- batches` in isolation before courses existed.
