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

export async function GET() {
  const { supabase, user, error } = await getAuthedSupabase();
  if (error) return json(401, { status: "error", message: error.message });
  if (!user) return json(401, { status: "error", message: "Not authenticated" });

  const { data: bookmarks, error: dbError } = await supabase
    .from("bookmarks")
    .select("id,title,url,created_at,user_id")
    .not("deleted_at", "is", null)
    .order("created_at", { ascending: false });

  if (dbError) return json(500, { status: "error", message: dbError.message });

  return json(200, { status: "success", message: "Deleted bookmarks fetched", data: bookmarks ?? [] });
}
