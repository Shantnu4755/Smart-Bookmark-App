import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HttpStatus = "success" | "error";

function json<T>(statusCode: number, body: { status: HttpStatus; message: string; data?: T }) {
  return NextResponse.json(body, { status: statusCode });
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return json(500, { status: "error", message: error.message });
  }

  return json(200, { status: "success", message: "Signed out" });
}
