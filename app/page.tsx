import { SignInWithGoogleButton } from "@/components/AuthButtons";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  const user = userData.user;

  if (user) {
    redirect("/homepage");
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16">
          <header className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
              <span className="text-xs font-medium tracking-wide text-slate-300">PRIVATE • REALTIME • SUPABASE</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">Smart Bookmark App</h1>
            <p className="max-w-xl text-slate-300">
              Sign in with Google to save bookmarks privately. Changes sync across tabs instantly.
            </p>
          </header>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 shadow-sm">
            <SignInWithGoogleButton />
            <p className="mt-3 text-xs text-slate-400">Google OAuth only. No email/password.</p>
          </div>
        </div>
      </div>
    );
  }
}
