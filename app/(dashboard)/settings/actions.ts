"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { AVATARS_BUCKET } from "@/lib/constants";
import { sanitizeWeights } from "@/lib/calculations/audience-fit";
import { EXTENSIONS, sniffImageType } from "@/lib/services/upload.service";
import { dbErrorMessage, fail, formDataToObject, parseWith, succeed, type ActionState } from "@/lib/utils/action-state";
import { parseSynonyms, profileSchema, weightsSchema } from "@/lib/validations/goals";

const refresh = () => revalidatePath("/", "layout");

export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = parseWith(profileSchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { preferred_reporting_period, ...profile } = parsed.data;
  const p = await supabase.from("profiles").update(profile).eq("id", user.id);
  if (p.error) return fail(dbErrorMessage(p.error));
  const pref = await supabase.from("user_preferences").upsert({ user_id: user.id, preferred_reporting_period }, { onConflict: "user_id" });
  if (pref.error) return fail(dbErrorMessage(pref.error));
  refresh();
  return succeed("Profile saved.");
}

export async function uploadAvatarAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const file = fd.get("avatar");
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image first.");
  if (file.size > 1024 * 1024) return fail("The image must be 1 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageType(bytes);
  if (!mime) return fail("Only genuine PNG, JPG or WEBP images are accepted.");

  const { data: current } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  const path = `${user.id}/avatar-${randomUUID()}.${EXTENSIONS[mime]}`;
  const up = await supabase.storage.from(AVATARS_BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
  if (up.error) return fail("The image could not be stored.");
  const upd = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
  if (upd.error) {
    await supabase.storage.from(AVATARS_BUCKET).remove([path]);
    return fail(dbErrorMessage(upd.error));
  }
  const old = (current as { avatar_url: string | null } | null)?.avatar_url;
  if (old) await supabase.storage.from(AVATARS_BUCKET).remove([old]);
  refresh();
  return succeed("Profile photo updated.");
}

export async function removeAvatarAction(): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  const old = (data as { avatar_url: string | null } | null)?.avatar_url;
  const upd = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (upd.error) return fail(dbErrorMessage(upd.error));
  if (old) await supabase.storage.from(AVATARS_BUCKET).remove([old]);
  refresh();
  return succeed("Profile photo removed.");
}

export async function updateScoringAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = parseWith(weightsSchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const synonyms = parseSynonyms(String(fd.get("synonyms") ?? ""));
  const { error } = await supabase
    .from("career_goals")
    .upsert({ user_id: user.id, scoring_weights: sanitizeWeights(parsed.data), synonyms }, { onConflict: "user_id" });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return succeed("Scoring settings saved. Your Audience Fit Score was recalculated.");
}

export async function resetScoringAction(): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("career_goals").update({ scoring_weights: sanitizeWeights(null), synonyms: {} }).eq("user_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return succeed("Scoring reset to the defaults.");
}
