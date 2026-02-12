"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignInWithGoogleButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-500 px-4 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60"
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const supabase = createSupabaseBrowserClient();
          const origin = window.location.origin;
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${origin}/auth/callback`,
            },
          });
          if (error) throw error;
        } finally {
          setLoading(false);
        }
      }}
    >
      Continue with Google
    </button>
  );
}
