import { BookmarkApp } from "@/components/BookmarkApp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Homepage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  const user = userData.user;
  if (!user) {
    redirect("/");
  }

  const { data: bookmarks, error } = await supabase
    .from("bookmarks")
    .select("id,title,url,created_at,user_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return <BookmarkApp userId={user.id} initialBookmarks={bookmarks ?? []} />;
}
