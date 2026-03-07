"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "./supabase";
import { requireAdmin } from "./admin-guard";
import type { VenueTemplate } from "./seatmap-types";

async function adminGuard() {
  return await requireAdmin();
}

function db() {
  return getSupabaseAdmin();
}

export async function getTemplates(): Promise<VenueTemplate[]> {
  await adminGuard();
  const { data, error } = await db()
    .from("venue_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as VenueTemplate[];
}

export async function deleteTemplate(id: string): Promise<void> {
  await adminGuard();
  const { error } = await db()
    .from("venue_templates")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/templates");
}
