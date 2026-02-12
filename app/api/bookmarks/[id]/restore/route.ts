import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HttpStatus = "success" | "error";

function json<T>(statusCode: number, body: { status: HttpStatus; message: string; data?: T }) {
  return NextResponse.json(body, { status: statusCode });
}

async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return { supabase, user: null, error };
  return { supabase, user: data.user, error: null };
}

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user, error } = await getAuthedSupabase();
  if (error) return json(401, { status: "error", message: error.message });
  if (!user) return json(401, { status: "error", message: "Not authenticated" });

  const { id } = await ctx.params;
  if (!id) return json(400, { status: "error", message: "id is required" });

  const { data: updated, error: dbError } = await supabase
    .from("bookmarks")
    .update({ deleted_at: null })
    .eq("id", id)
    .select("id,title,url,created_at,user_id")
    .single();

  if (dbError) return json(500, { status: "error", message: dbError.message });

  return json(200, { status: "success", message: "Bookmark restored", data: updated });
}
