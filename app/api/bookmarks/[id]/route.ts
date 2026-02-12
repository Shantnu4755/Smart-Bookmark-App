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
  if (error) return { supabase, user: null, error };
  return { supabase, user: data.user, error: null };
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user, error } = await getAuthedSupabase();
  if (error) return json(401, { status: "error", message: error.message });
  if (!user) return json(401, { status: "error", message: "Not authenticated" });

  const { id } = await ctx.params;
  if (!id) return json(400, { status: "error", message: "id is required" });

  const { data: updated, error: dbError } = await supabase
    .from("bookmarks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,title,url,created_at,user_id")
    .single();

  if (dbError) return json(500, { status: "error", message: dbError.message });

  return json(200, { status: "success", message: "Bookmark deleted", data: updated });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user, error } = await getAuthedSupabase();
  if (error) return json(401, { status: "error", message: error.message });
  if (!user) return json(401, { status: "error", message: "Not authenticated" });

  const { id } = await ctx.params;
  if (!id) return json(400, { status: "error", message: "id is required" });

  const body = (await request.json().catch(() => null)) as null | {
    title?: string;
    url?: string;
  };

  const update: { title?: string; url?: string } = {};

  if (typeof body?.title === "string" && body.title.trim()) {
    update.title = body.title.trim();
  }

  if (typeof body?.url === "string" && body.url.trim()) {
    try {
      update.url = normalizeUrl(body.url);
    } catch {
      return json(400, { status: "error", message: "Invalid URL" });
    }
  }

  if (Object.keys(update).length === 0) {
    return json(400, { status: "error", message: "No fields to update" });
  }

  const { data: updated, error: dbError } = await supabase
    .from("bookmarks")
    .update(update)
    .eq("id", id)
    .select("id,title,url,created_at,user_id")
    .single();

  if (dbError) return json(500, { status: "error", message: dbError.message });

  return json(200, { status: "success", message: "Bookmark updated", data: updated });
}
