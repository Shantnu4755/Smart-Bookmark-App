"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  return url.toString();
}

export async function addBookmark(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const rawUrl = String(formData.get("url") ?? "").trim();

  if (!title) throw new Error("Title is required");
  if (!rawUrl) throw new Error("URL is required");

  const url = normalizeUrl(rawUrl);

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Not authenticated");

  const { error } = await supabase.from("bookmarks").insert({
    user_id: userData.user.id,
    title,
    url,
  });

  if (error) throw error;

  revalidatePath("/");
}

export async function deleteBookmark(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing bookmark id");

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("bookmarks").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  revalidatePath("/");
}
