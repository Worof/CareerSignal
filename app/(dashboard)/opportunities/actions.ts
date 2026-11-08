"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createOpportunity, deleteOpportunity, updateOpportunity, updateOpportunityStatus } from "@/lib/services/opportunity.service";
import { dbErrorMessage, fail, formDataToObject, parseWith, succeed, type ActionState } from "@/lib/utils/action-state";
import { uuid } from "@/lib/validations/common";
import { opportunitySchema, statusSchema } from "@/lib/validations/opportunities";

const refresh = () => revalidatePath("/", "layout");

export async function createOpportunityAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = parseWith(opportunitySchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { data, error } = await createOpportunity(supabase, user.id, parsed.data);
  if (error || !data) return fail(dbErrorMessage(error));
  refresh();
  redirect(`/opportunities/${(data as { id: string }).id}`);
}

export async function updateOpportunityAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const parsed = parseWith(opportunitySchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { error } = await updateOpportunity(supabase, id, parsed.data);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return succeed("Opportunity updated.");
}

export async function updateStatusAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const parsed = parseWith(statusSchema, formDataToObject(fd));
  if (!parsed.ok) return parsed.state;
  const { error } = await updateOpportunityStatus(supabase, id, parsed.data.status);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return succeed("Status updated.");
}

export async function deleteOpportunityAction(id: string, redirectTo?: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const { error } = await deleteOpportunity(supabase, id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  if (redirectTo) redirect(redirectTo);
  return succeed("Opportunity deleted.");
}
