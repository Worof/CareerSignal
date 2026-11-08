"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSegment, deleteSegment } from "@/lib/services/audience.service";
import { createSnapshot, deleteSnapshot, updateSnapshot } from "@/lib/services/analytics.service";
import { dbErrorMessage, fail, formDataToObject, parseWith, succeed, type ActionState } from "@/lib/utils/action-state";
import { segmentSchema, snapshotSchema } from "@/lib/validations/analytics";
import { uuid } from "@/lib/validations/common";

const refresh = () => revalidatePath("/", "layout");

export async function createSnapshotAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = parseWith(snapshotSchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { data, error } = await createSnapshot(supabase, user.id, parsed.data);
  if (error || !data) return fail(dbErrorMessage(error));
  refresh();
  redirect(`/analytics/${(data as { id: string }).id}?created=1`);
}

export async function updateSnapshotAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const parsed = parseWith(snapshotSchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { error } = await updateSnapshot(supabase, id, parsed.data);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return succeed("Snapshot updated. Dashboard figures were recalculated.");
}

export async function deleteSnapshotAction(id: string, redirectTo?: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const { error } = await deleteSnapshot(supabase, id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  if (redirectTo) redirect(redirectTo);
  return succeed("Snapshot deleted along with its audience segments.");
}

export async function createSegmentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = parseWith(segmentSchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { error } = await createSegment(supabase, user.id, parsed.data);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return succeed("Segment added.");
}

export async function deleteSegmentAction(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const { error } = await deleteSegment(supabase, id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return succeed("Segment removed.");
}
