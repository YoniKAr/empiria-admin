"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { getSupabaseAdmin } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TicketTierInput {
  name: string;
  description: string;
  price: number;
  currency: string;
  initial_quantity: number;
  max_per_order: number;
  sales_start_at: string;
  sales_end_at: string;
  is_hidden: boolean;
}

interface OccurrenceInput {
  starts_at: string;
  ends_at: string;
  label: string;
}

export interface EventFormInput {
  title: string;
  slug: string;
  description: string;
  what_to_expect: string[];
  category_id: string;
  tags: string[];
  cover_image_url: string;
  sales_start_at: string;
  sales_end_at: string;
  occurrences: OccurrenceInput[];
  location_type: string;
  venue_name: string;
  address_text: string;
  city: string;
  currency: string;
  ticket_tiers: TicketTierInput[];
  seating_type?: string;
  seating_config?: Record<string, unknown> | null;
}

interface RevenueSplitInput {
  recipientUserId: string;
  recipientStripeId: string;
  recipientName: string;
  percentage: number;
  description: string;
}

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildTiers(eventId: string, tiers: TicketTierInput[]) {
  return tiers.map((t) => ({
    event_id: eventId,
    name: t.name,
    description: t.description || null,
    price: t.price || 0,
    currency: t.currency || "cad",
    initial_quantity: t.initial_quantity,
    remaining_quantity: t.initial_quantity,
    max_per_order: t.max_per_order || 10,
    sales_start_at: t.sales_start_at || null,
    sales_end_at: t.sales_end_at || null,
    is_hidden: t.is_hidden || false,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE EVENT
// ═══════════════════════════════════════════════════════════════════════════

export async function adminCreateEvent(
  form: EventFormInput
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const supabase = getSupabaseAdmin();

  if (!form.category_id) {
    return { success: false, error: "Category is required" };
  }

  // Validate slug uniqueness
  const { data: existingEvent } = await supabase
    .from("events")
    .select("id")
    .eq("slug", form.slug)
    .maybeSingle();

  if (existingEvent) {
    return { success: false, error: "An event with this slug already exists" };
  }

  const totalCapacity = form.ticket_tiers.reduce(
    (sum, t) => sum + (t.initial_quantity || 0),
    0
  );

  // Create event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      organizer_id: admin.auth0_id,
      title: form.title,
      slug: form.slug,
      description: form.description
        ? JSON.stringify({ text: form.description })
        : null,
      what_to_expect: form.what_to_expect
        ? form.what_to_expect.filter((p) => p.trim() !== "")
        : [],
      category_id: form.category_id || null,
      tags: form.tags || [],
      cover_image_url: form.cover_image_url || null,
      sales_start_at: form.sales_start_at || null,
      sales_end_at: form.sales_end_at || null,
      location_type: form.location_type || "physical",
      venue_name: form.venue_name || null,
      address_text: form.address_text || null,
      city: form.city || null,
      currency: form.currency || "cad",
      total_capacity: totalCapacity,
      seating_type: form.seating_type || "general_admission",
      seating_config: form.seating_config || {},
      status: "draft",
      source_app: "admin",
    })
    .select("id")
    .single();

  if (eventError || !event) {
    console.error("Admin event creation error:", eventError);
    return {
      success: false,
      error: eventError?.message || "Failed to create event",
    };
  }

  // Create event occurrences
  if (form.occurrences.length > 0) {
    const { error: occError } = await supabase
      .from("event_occurrences")
      .insert(
        form.occurrences.map((o) => ({
          event_id: event.id,
          starts_at: o.starts_at,
          ends_at: o.ends_at,
          label: o.label || null,
        }))
      );

    if (occError) {
      console.error("Occurrence insert error:", occError);
      // Clean up the event if occurrences fail
      await supabase.from("events").delete().eq("id", event.id);
      return { success: false, error: occError.message };
    }
  }

  // Create ticket tiers
  if (form.ticket_tiers.length > 0) {
    const { error: tierError } = await supabase
      .from("ticket_tiers")
      .insert(buildTiers(event.id, form.ticket_tiers));

    if (tierError) {
      console.error("Tier insert error:", tierError);
      // Clean up the event if tiers fail
      await supabase.from("events").delete().eq("id", event.id);
      return { success: false, error: tierError.message };
    }
  }

  revalidatePath("/dashboard/events");
  return { success: true, data: { id: event.id } };
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE EVENT
// ═══════════════════════════════════════════════════════════════════════════

export async function adminUpdateEvent(
  eventId: string,
  form: EventFormInput
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  // Verify the event exists (admin can edit any event)
  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .single();

  if (!existing) {
    return { success: false, error: "Event not found" };
  }

  if (!form.category_id) {
    return { success: false, error: "Category is required" };
  }

  const totalCapacity = form.ticket_tiers.reduce(
    (sum, t) => sum + (t.initial_quantity || 0),
    0
  );

  const { error: updateError } = await supabase
    .from("events")
    .update({
      title: form.title,
      slug: form.slug,
      description: form.description
        ? JSON.stringify({ text: form.description })
        : null,
      what_to_expect: form.what_to_expect
        ? form.what_to_expect.filter((p) => p.trim() !== "")
        : [],
      category_id: form.category_id || null,
      tags: form.tags || [],
      cover_image_url: form.cover_image_url || null,
      sales_start_at: form.sales_start_at || null,
      sales_end_at: form.sales_end_at || null,
      location_type: form.location_type || "physical",
      venue_name: form.venue_name || null,
      address_text: form.address_text || null,
      city: form.city || null,
      currency: form.currency || "cad",
      total_capacity: totalCapacity,
      seating_type: form.seating_type || "general_admission",
      seating_config: form.seating_config || {},
    })
    .eq("id", eventId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Replace occurrences
  if (form.occurrences.length > 0) {
    await supabase.from("event_occurrences").delete().eq("event_id", eventId);

    const { error: occError } = await supabase
      .from("event_occurrences")
      .insert(
        form.occurrences.map((o) => ({
          event_id: eventId,
          starts_at: o.starts_at,
          ends_at: o.ends_at,
          label: o.label || null,
        }))
      );

    if (occError) {
      return { success: false, error: occError.message };
    }
  }

  // Replace ticket tiers
  if (form.ticket_tiers.length > 0) {
    await supabase.from("ticket_tiers").delete().eq("event_id", eventId);

    const { error: tierError } = await supabase
      .from("ticket_tiers")
      .insert(buildTiers(eventId, form.ticket_tiers));

    if (tierError) {
      return { success: false, error: tierError.message };
    }
  }

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: true, data: { id: eventId } };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLISH EVENT
// ═══════════════════════════════════════════════════════════════════════════

export async function adminPublishEvent(
  eventId: string
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: event } = await supabase
    .from("events")
    .select("id, status, title, category_id")
    .eq("id", eventId)
    .single();

  if (!event) {
    return { success: false, error: "Event not found" };
  }

  if (event.status !== "draft") {
    return {
      success: false,
      error: `Cannot publish event with status "${event.status}"`,
    };
  }

  if (!event.title) {
    return { success: false, error: "Event must have a title" };
  }

  if (!event.category_id) {
    return { success: false, error: "Event must have a category" };
  }

  // Require at least one occurrence
  const { count: occCount } = await supabase
    .from("event_occurrences")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (!occCount || occCount === 0) {
    return {
      success: false,
      error: "Event must have at least one event date",
    };
  }

  // Require at least one ticket tier
  const { count: tierCount } = await supabase
    .from("ticket_tiers")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (!tierCount || tierCount === 0) {
    return {
      success: false,
      error: "Event must have at least one ticket tier",
    };
  }

  const { error } = await supabase
    .from("events")
    .update({ status: "published" })
    .eq("id", eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: true, data: { id: eventId } };
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE REVENUE SPLITS
// ═══════════════════════════════════════════════════════════════════════════

export async function adminSaveRevenueSplits(
  eventId: string,
  splits: RevenueSplitInput[]
): Promise<ActionResult<{ count: number }>> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  // Verify the event exists
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .single();

  if (!event) {
    return { success: false, error: "Event not found" };
  }

  // Delete existing splits for this event
  await supabase.from("revenue_splits").delete().eq("event_id", eventId);

  if (splits.length === 0) {
    return { success: true, data: { count: 0 } };
  }

  const splitsToInsert = splits.map((s) => ({
    event_id: eventId,
    recipient_user_id: s.recipientUserId,
    recipient_stripe_id: s.recipientStripeId,
    percentage: s.percentage,
    source_type: "net_revenue",
    description: s.description || `Split for ${s.recipientName}`,
  }));

  const { error } = await supabase
    .from("revenue_splits")
    .insert(splitsToInsert);

  if (error) {
    console.error("Revenue splits insert error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: true, data: { count: splits.length } };
}
