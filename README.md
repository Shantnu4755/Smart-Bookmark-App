# Smart Bookmark App

Built by **Shantnu**.

A simple, private bookmark manager. Sign in with **Google** and manage your own bookmarks. Updates sync in **real-time** across tabs.

## Tech stack

- Next.js (App Router)
- Supabase (Auth + Postgres + Realtime)
- Tailwind CSS

## Features

- Google OAuth only (no email/password)
- Add bookmark (title + URL)
- Edit bookmark (title + URL)
- Delete bookmark
- Private per user enforced in Postgres using **Row Level Security** policies
- Real-time list updates across tabs using Supabase Realtime Postgres changes

## Project structure (what to explain in interviews)

- `/` page: `app/page.tsx`
- Auth callback: `app/auth/callback/route.ts`
- Bookmarks UI: `components/BookmarkApp.tsx`
- API routes:
  - `app/api/bookmarks/route.ts` (GET, POST)
  - `app/api/bookmarks/[id]/route.ts` (PATCH, DELETE)
- Supabase clients:
  - `lib/supabase/server.ts`
  - `lib/supabase/browser.ts`
- Session sync: `middleware.ts`

## Prerequisites

- Node.js 18+
- A Supabase project
- A Google Cloud OAuth client

## Local setup

### 1) Create a Supabase project + copy keys

From Supabase project settings, copy:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2) Create database objects

Create the following in Supabase:

- Table: `public.bookmarks`
- Index: `bookmarks_user_id_created_at_idx`
- Policies on `public.bookmarks`:
  - `select own bookmarks`
  - `insert own bookmarks`
  - `delete own bookmarks`
  - `update own bookmarks`

### 3) Enable realtime on the table

Enable replication for `public.bookmarks` (Database → Replication), or run:

```sql
alter publication supabase_realtime add table public.bookmarks;
```

### 4) Configure Google OAuth

In Supabase:

- Authentication → Providers → Google: enable and set Client ID/Secret
- Authentication → URL Configuration:
  - Site URL: `http://localhost:3000`
  - Additional Redirect URLs:
    - `http://localhost:3000/auth/callback`
    - `https://<your-vercel-domain>/auth/callback`

In Google Cloud Console OAuth Client:

- Authorized redirect URIs:
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>/auth/callback`

### 5) Environment variables

This repo ignores `.env*` files.

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 6) Install + run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Input validation

- **Title** is required
- **URL** is required and must be a valid `http/https` URL
- URLs are normalized (typing `example.com` becomes `https://example.com`)

## Problems I ran into (and how I solved them)

- **Google OAuth needs a server callback in App Router**
  The OAuth redirect returns a `code` that must be exchanged for a Supabase session on the server. This is handled in **`app/auth/callback/route.ts`** using `exchangeCodeForSession()`.

- **Redirect URL mismatch during OAuth**
  Login failed when Supabase redirect URLs and Google authorized redirect URIs did not match exactly. The fix was to use a single callback path (**`/auth/callback`**) and add both **local** and **production** URLs in Supabase and Google.

- **Row Level Security blocked writes at first**
  Inserts/deletes failed with row-level security errors until the policies matched the data being written.
  Fix:
  - ensure inserts include the authenticated user id (`user_id = auth.uid()`)
  - add policies for select/insert/update/delete restricted to the current user

- **Vercel deployment failed due to missing env vars**
  The app returned 500 errors when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` were missing in **Vercel → Production**.
  Fix:
  - add the env vars in Vercel project settings
  - redeploy

- **Middleware invocation failure**
  Middleware can fail a request if a network/auth call throws.
  Fix:
  - handle errors safely in `middleware.ts` so requests still return a response
