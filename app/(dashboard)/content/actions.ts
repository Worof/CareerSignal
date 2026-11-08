"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createPost, deletePost, deletePostMetric, savePostMetrics, updatePost } from "@/lib/services/content.service";
import { dbErrorMessage, fail, formDataToObject, parseWith, succeed, type ActionState } from "@/lib/utils/action-state";
import { uuid } from "@/lib/validations/common";
import { postMetricSchema, postSchema } from "@/lib/validations/content";

const refresh = () => revalidatePath("/", "layout");

export async function createPostAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = parseWith(postSchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { data, error } = await createPost(supabase, user.id, parsed.data);
  if (error || !data) return fail(dbErrorMessage(error));
  refresh();
  redirect(`/content/${(data as { id: string }).id}`);
}

export async function updatePostAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const parsed = parseWith(postSchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { error } = await updatePost(supabase, id, parsed.data);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return succeed("Post updated.");
}

export async function deletePostAction(id: string, redirectTo?: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const { error } = await deletePost(supabase, id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  if (redirectTo) redirect(redirectTo);
  return succeed("Post deleted with its metrics and audience data.");
}

export async function savePostMetricsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = parseWith(postMetricSchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { error } = await savePostMetrics(supabase, user.id, parsed.data);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return succeed("Performance snapshot saved.");
}

export async function deletePostMetricAction(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const { error } = await deletePostMetric(supabase, id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return succeed("Snapshot removed.");
}
