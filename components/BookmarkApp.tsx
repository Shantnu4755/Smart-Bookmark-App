"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Bookmark = {
  id: string;
  title: string;
  url: string;
  created_at: string;
  user_id: string;
};

type ApiResponse<T> = {
  status: "success" | "error";
  message: string;
  data?: T;
};

export function BookmarkApp(props: {
  userId: string;
  initialBookmarks: Bookmark[];
}) {
  const { userId, initialBookmarks } = props;

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function refreshBookmarks() {
    const res = await fetch("/api/bookmarks", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const json = (await res.json()) as ApiResponse<Bookmark[]>;
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || "Failed to load bookmarks");
    }
    setBookmarks(json.data ?? []);
  }

  async function createBookmark() {
    if (!title.trim() || !url.trim()) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ title, url }),
      });
      const json = (await res.json()) as ApiResponse<Bookmark>;
      if (!res.ok || json.status !== "success") {
        throw new Error(json.message || "Failed to create bookmark");
      }

      setTitle("");
      setUrl("");

      await refreshBookmarks();

      alert("Bookmark created");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function removeBookmark(id: string) {
    const confirmed = confirm("Delete this bookmark? It will move to Deleted Bookmarks.");
    if (!confirmed) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/bookmarks/${id}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        }
      );
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || json.status !== "success") {
        throw new Error(json.message || "Failed to delete bookmark");
      }

      await refreshBookmarks();

      alert("Bookmark deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    const confirmed = confirm("Sign out? ");
    if (!confirmed) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signout", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || json.status !== "success") {
        throw new Error(json.message || "Failed to sign out");
      }
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel("bookmarks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setBookmarks((current) => {
            if (payload.eventType === "INSERT") {
              const b = payload.new as Bookmark;
              if (current.some((x) => x.id === b.id)) return current;
              return [b, ...current].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
            }

            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as { id: string };
              return current.filter((x) => x.id !== oldRow.id);
            }

            if (payload.eventType === "UPDATE") {
              const b = payload.new as Bookmark;
              return current.map((x) => (x.id === b.id ? b : x));
            }

            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Smart Bookmark App</h1>
            <p className="text-sm text-slate-300">Your bookmarks. Private. Real-time.</p>
          </div>

          <button
            onClick={signOut}
            disabled={loading}
            className="h-10 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-100 hover:bg-slate-900 disabled:opacity-60"
            type="button"
          >
            Sign out
          </button>
        </header>

        {error ? (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-200">Add bookmark</h2>
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-slate-200"
              onClick={() => {
                setError(null);
                setLoading(true);
                refreshBookmarks()
                  .catch((e) => setError(e instanceof Error ? e.message : "Failed to refresh"))
                  .finally(() => setLoading(false));
              }}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="h-11 rounded-md border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-600"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL (example.com or https://example.com)"
              className="h-11 rounded-md border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-600"
            />
            <button
              type="button"
              onClick={createBookmark}
              disabled={loading || !title.trim() || !url.trim()}
              className="h-11 rounded-md bg-indigo-500 px-4 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60"
            >
              Add
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-200">Bookmarks</h2>
            <span className="rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-xs text-slate-300">
              {bookmarks.length}
            </span>
          </div>

          {bookmarks.length === 0 ? (
            <p className="text-sm text-slate-400">No bookmarks yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {bookmarks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-50">{b.title}</div>
                    <a
                      className="block truncate text-sm text-slate-400 hover:text-slate-200"
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {b.url}
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeBookmark(b.id)}
                    disabled={loading}
                    className="h-9 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-100 hover:bg-slate-900 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
