# Smart Bookmark App
 
Simple bookmark manager built with:
 
- **Next.js (App Router)**
- **Supabase (Auth + Postgres + Realtime)**
- **Tailwind CSS**
 
 ## Features
 
- **Google OAuth only** (no email/password)
- **Add bookmark** (title + URL)
- **Delete bookmark**
- **Private per user** via Postgres **RLS policies**
- **Real-time updates** across tabs using Supabase Realtime Postgres changes
 
## Prerequisites

- Node.js 18+
- A Supabase project
- A Google Cloud OAuth client (for Google login)

## Local setup

### 0) Create the project (from scratch)

```bash
npx create-next-app@latest smart-bookmark-app
```

Recommended prompts:

- Use App Router: **Yes**
- Tailwind CSS: **Yes**
- TypeScript: **Yes**

Then:

```bash
cd smart-bookmark-app
npm install
```
 
### 1) Create Supabase project
 
- Create a new project in Supabase.
- Copy:
 
 - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
 - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 
### 2) Create DB table + RLS
 
 In Supabase SQL editor, run:
 
```sql
create table if not exists public.bookmarks (
   id uuid primary key default gen_random_uuid(),
   user_id uuid not null references auth.users (id) on delete cascade,
   title text not null,
   url text not null,
   created_at timestamptz not null default now()
 );
 
create index if not exists bookmarks_user_id_created_at_idx
   on public.bookmarks (user_id, created_at desc);
 
alter table public.bookmarks enable row level security;
 
create policy "select own bookmarks" on public.bookmarks
   for select using (auth.uid() = user_id);
 
create policy "insert own bookmarks" on public.bookmarks
   for insert with check (auth.uid() = user_id);
 
create policy "delete own bookmarks" on public.bookmarks
   for delete using (auth.uid() = user_id);
 
create policy "update own bookmarks" on public.bookmarks
   for update using (auth.uid() = user_id);
```
 
### 3) Enable Realtime for the table
 
 In Supabase:
 
- Go to **Database -> Replication**
- Enable replication for the `bookmarks` table
 
 (Or run SQL)
 
```sql
alter publication supabase_realtime add table public.bookmarks;
```
 
### 4) Configure Google OAuth
 
 - In Google Cloud Console, create OAuth Client credentials.
 - In Supabase: **Authentication -> Providers -> Google**
 
 Set the Google client ID/secret.
 
 Add redirect URLs:
 
 - `http://localhost:3000/auth/callback`
 - `https://<your-vercel-domain>/auth/callback`
 
 Also set Supabase Auth:
 
 - **Site URL**: `http://localhost:3000` (for local)
 - **Additional Redirect URLs**: include both callback URLs above
 
### 5) Add env vars
 
 This repo ignores `.env*` files.
 
 Create `.env.local`:
 
```bash
NEXT_PUBLIC_SUPABASE_URL=....
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
 
### 6) Run
 
```bash
npm install
npm run dev
```
 
Open `http://localhost:3000`.
 
## Problems I ran into (and how I solved them)
 
- **OAuth in Next.js App Router**
  The Google OAuth flow needs a server endpoint to exchange the `code` for a session.
  I added `app/auth/callback/route.ts` which calls `supabase.auth.exchangeCodeForSession(code)`.
 
- **Keeping auth sessions consistent (cookies)**
  App Router uses server rendering + client components, so the session cookie must be refreshed correctly.
  I added `middleware.ts` using `@supabase/ssr` so requests keep auth in sync.
 
- **Real-time per-user updates**
  I used `postgres_changes` Realtime subscription filtered by `user_id=eq.<currentUserId>`.
  Privacy is guaranteed by RLS policies and the per-user filter.

- **RLS policy failures during insert/delete**
  When I first wired up create/delete, requests failed with `new row violates row-level security`.
  I fixed this by ensuring inserts always set `user_id` to `auth.uid()` (server-side or client-side with an authenticated session) and by adding explicit `insert` / `delete` policies restricted to `auth.uid() = user_id`.

- **Google redirect URL mismatches**
  Supabase + Google OAuth will fail if the callback/redirect URLs don’t match exactly.
  I solved this by keeping a single callback endpoint (`/auth/callback`) and adding both local and production URLs into Supabase **Additional Redirect URLs** and the Google OAuth client authorized redirect URIs.
