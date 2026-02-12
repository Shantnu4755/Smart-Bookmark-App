import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const response = NextResponse.redirect(new URL("/", request.url));

  console.log("[auth/callback] hit", {
    hasCode: Boolean(code),
    origin: url.origin,
    redirectPath: url.pathname,
  });

  if (code) {
    try {
      const cookieStore = await cookies();

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.log("[auth/callback] missing env");
        return response;
      }

      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.log("[auth/callback] exchangeCodeForSession error", {
          message: error.message,
          status: error.status,
          name: error.name,
        });
      } else {
        console.log("[auth/callback] exchangeCodeForSession ok", {
          hasSession: Boolean(data.session),
          userId: data.session?.user?.id,
        });
      }
    } catch (e) {
      console.log("[auth/callback] exception", e);
    }
  }

  return response;
}
