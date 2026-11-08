import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, PostMetric } from "@/lib/types/db";
import type { z } from "zod";
import type { postMetricSchema, postSchema } from "@/lib/validations/content";

export type PostInput = z.output<typeof postSchema>;
export type PostMetricInput = z.output<typeof postMetricSchema>;

export async function listPosts(supabase: SupabaseClient): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw new Error(`Failed to load posts: ${error.message}`);
  return (data ?? []) as Post[];
}

export async function getPost(supabase: SupabaseClient, id: string): Promise<Post | null> {
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load post: ${error.message}`);
  return data as Post | null;
}

export async function listPostMetrics(supabase: SupabaseClient, postIds?: string[]): Promise<PostMetric[]> {
  let q = supabase.from("post_metrics").select("*").order("reporting_period_end", { ascending: false });
  if (postIds) {
    if (postIds.length === 0) return [];
    q = q.in("post_id", postIds);
  }
  const { data, error } = await q.limit(2000);
  if (error) throw new Error(`Failed to load post metrics: ${error.message}`);
  return (data ?? []) as PostMetric[];
}

const toTimestamp = (d: string | null) => (d ? new Date(d).toISOString() : null);

export async function createPost(supabase: SupabaseClient, userId: string, input: PostInput) {
  return supabase
    .from("posts")
    .insert({ ...input, published_at: toTimestamp(input.published_at), user_id: userId })
    .select("id")
    .single();
}

export async function updatePost(supabase: SupabaseClient, id: string, input: PostInput) {
  return supabase.from("posts").update({ ...input, published_at: toTimestamp(input.published_at) }).eq("id", id).select("id").single();
}

export async function deletePost(supabase: SupabaseClient, id: string) {
  return supabase.from("posts").delete().eq("id", id);
}

export async function savePostMetrics(
  supabase: SupabaseClient,
  userId: string,
  input: PostMetricInput,
  dataSource: "manual" | "screenshot" = "manual",
) {
  return supabase.from("post_metrics").insert({ ...input, user_id: userId, data_source: dataSource }).select("id").single();
}

export async function deletePostMetric(supabase: SupabaseClient, id: string) {
  return supabase.from("post_metrics").delete().eq("id", id);
}
