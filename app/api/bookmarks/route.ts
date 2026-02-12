import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HttpStatus = "success" | "error";

function json<T>(statusCode: number, body: { status: HttpStatus; message: string; data?: T }) {
  return NextResponse.json(body, { status: statusCode });
}

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  return url.toString();
}

async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { supabase, user: null, error };
  }
  return { supabase, user: data.user, error: null };
}

export async function GET() {
  const { supabase, user, error } = await getAuthedSupabase();
  if (error) {
    return json(401, { status: "error", message: error.message });
  }
  if (!user) {
    return json(401, { status: "error", message: "Not authenticated" });
  }

  const { data: bookmarks, error: dbError } = await supabase
    .from("bookmarks")
    .select("id,title,url,created_at,user_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (dbError) {
    return json(500, { status: "error", message: dbError.message });
  }

  return json(200, { status: "success", message: "Bookmarks fetched", data: bookmarks ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthedSupabase();
  if (error) {
    return json(401, { status: "error", message: error.message });
  }
  if (!user) {
    return json(401, { status: "error", message: "Not authenticated" });
  }

  const body = (await request.json().catch(() => null)) as null | {
    title?: string;
    url?: string;
  };

  const title = String(body?.title ?? "").trim();
  const rawUrl = String(body?.url ?? "").trim();

  if (!title) {
    return json(400, { status: "error", message: "Title is required" });
  }
  if (!rawUrl) {
    return json(400, { status: "error", message: "URL is required" });
  }

  let url: string;
  try {
    url = normalizeUrl(rawUrl);
  } catch {
    return json(400, { status: "error", message: "Invalid URL" });
  }

  const { data: created, error: dbError } = await supabase
    .from("bookmarks")
    .insert({ user_id: user.id, title, url })
    .select("id,title,url,created_at,user_id")
    .single();

  if (dbError) {
    return json(500, { status: "error", message: dbError.message });
  }

  return json(201, { status: "success", message: "Bookmark created", data: created });
}
