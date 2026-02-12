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

## Challenges & solutions

- **Challenge: Google OAuth in App Router**
  - **Issue:** after Google sign-in, the app receives a `code` that must be exchanged for a Supabase session.
  - **Solution:** handled the exchange in **`app/auth/callback/route.ts`** using `exchangeCodeForSession()`.

- **Challenge: Redirect URL mismatch**
  - **Issue:** login fails if Supabase redirect URLs and Google authorized redirect URIs don’t match exactly.
  - **Solution:** used one callback path (**`/auth/callback`**) and registered both **local** + **production** URLs in Supabase and Google.

- **Challenge: Row Level Security blocked writes**
  - **Issue:** insert/update/delete can fail if policies don’t match what the app writes.
  - **Solution:** stored the owner id (`user_id = auth.uid()`) and added policies that allow **only the owner** to select/insert/update/delete.

- **Challenge: Vercel 500 errors after deploy**
  - **Issue:** missing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in **Production** causes server errors.
  - **Solution:** set env vars in **Vercel → Project Settings → Environment Variables** and redeployed.

- **Challenge: Middleware invocation failure**
  - **Issue:** middleware can break the request if an auth/network call throws.
  - **Solution:** handled errors safely in `middleware.ts` so the request still returns a response. 
