"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendTicketEmail } from "@/lib/ticket-email";

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL TICKET ISSUANCE (Admin)
// ═══════════════════════════════════════════════════════════════════════════

export async function adminIssueTickets(input: {
  eventId: string;
  tierId: string;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  reason: string;
  isFree: boolean;
}): Promise<ActionResult<{ orderId: string; ticketIds: string[] }>> {
  const admin = await requireAdmin();
  const supabase = getSupabaseAdmin();

  // Verify event exists
  const { data: event } = await supabase
    .from("events")
    .select("id, title, currency")
    .eq("id", input.eventId)
    .single();

  if (!event) return { success: false, error: "Event not found" };

  // Verify tier belongs to event and has remaining quantity
  const { data: tier } = await supabase
    .from("ticket_tiers")
    .select("id, name, price, currency, remaining_quantity")
    .eq("id", input.tierId)
    .eq("event_id", input.eventId)
    .single();

  if (!tier) return { success: false, error: "Ticket tier not found for this event" };

  if (tier.remaining_quantity < input.quantity) {
    return { success: false, error: `Only ${tier.remaining_quantity} tickets remaining in "${tier.name}"` };
  }

  const unitPrice = input.isFree ? 0 : Number(tier.price);
  const totalAmount = unitPrice * input.quantity;
  const currency = tier.currency || event.currency || "cad";

  // Create a manual order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: null,
      event_id: input.eventId,
      stripe_payment_intent_id: null,
      stripe_checkout_session_id: null,
      total_amount: totalAmount,
      platform_fee_amount: 0,
      organizer_payout_amount: totalAmount,
      currency,
      buyer_email: input.attendeeEmail,
      buyer_name: input.attendeeName,
      status: "completed",
      source_app: "admin",
      notes: `Admin manual issuance: ${input.reason}`,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Admin manual order creation error:", orderError);
    return { success: false, error: orderError?.message || "Failed to create order" };
  }

  // Create order item
  await supabase.from("order_items").insert({
    order_id: order.id,
    tier_id: input.tierId,
    quantity: input.quantity,
    unit_price: unitPrice,
    subtotal: totalAmount,
  });

  // Create tickets — DB trigger handles inventory
  const ticketInserts = Array.from({ length: input.quantity }, () => ({
    event_id: input.eventId,
    tier_id: input.tierId,
    order_id: order.id,
    user_id: null,
    attendee_name: input.attendeeName,
    attendee_email: input.attendeeEmail,
    status: "valid" as const,
    issued_by: admin.auth0_id,
    issue_reason: input.reason,
  }));

  const { data: tickets, error: ticketError } = await supabase
    .from("tickets")
    .insert(ticketInserts)
    .select("id");

  if (ticketError || !tickets) {
    console.error("Admin ticket creation error:", ticketError);
    return { success: false, error: ticketError?.message || "Failed to create tickets" };
  }

  revalidatePath(`/dashboard/events/${input.eventId}`);
  return { success: true, data: { orderId: order.id, ticketIds: tickets.map((t) => t.id) } };
}

// ═══════════════════════════════════════════════════════════════════════════
// REISSUE TICKET (Admin)
// ═══════════════════════════════════════════════════════════════════════════

export async function adminReissueTicket(input: {
  orderId: string;
  oldTicketId: string;
  newAttendeeName: string;
  newAttendeeEmail: string;
  reason: string;
}): Promise<ActionResult<{ newTicketId: string }>> {
  const admin = await requireAdmin();
  const supabase = getSupabaseAdmin();

  // Fetch old ticket
  const { data: oldTicket } = await supabase
    .from("tickets")
    .select("id, status, event_id, tier_id, order_id")
    .eq("id", input.oldTicketId)
    .eq("order_id", input.orderId)
    .single();

  if (!oldTicket) return { success: false, error: "Ticket not found on this order" };
  if (oldTicket.status !== "valid") return { success: false, error: `Cannot reissue a ticket with status "${oldTicket.status}"` };

  // Get event for inventory update
  const { data: event } = await supabase
    .from("events")
    .select("id, total_tickets_sold")
    .eq("id", oldTicket.event_id)
    .single();

  if (!event) return { success: false, error: "Event not found" };

  // Cancel old ticket
  await supabase.from("tickets").update({ status: "cancelled" }).eq("id", input.oldTicketId);

  // Restore inventory (new ticket trigger will decrement again — net zero)
  const { data: currentTier } = await supabase
    .from("ticket_tiers")
    .select("remaining_quantity")
    .eq("id", oldTicket.tier_id)
    .single();

  if (currentTier) {
    await supabase
      .from("ticket_tiers")
      .update({ remaining_quantity: currentTier.remaining_quantity + 1 })
      .eq("id", oldTicket.tier_id);
  }

  await supabase
    .from("events")
    .update({ total_tickets_sold: Math.max(0, event.total_tickets_sold - 1) })
    .eq("id", oldTicket.event_id);

  // Create new ticket
  const { data: newTicket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      event_id: oldTicket.event_id,
      tier_id: oldTicket.tier_id,
      order_id: oldTicket.order_id,
      user_id: null,
      attendee_name: input.newAttendeeName,
      attendee_email: input.newAttendeeEmail,
      status: "valid",
      issued_by: admin.auth0_id,
      issue_reason: `Reissue: ${input.reason}`,
      original_ticket_id: input.oldTicketId,
    })
    .select("id")
    .single();

  if (ticketError || !newTicket) {
    return { success: false, error: ticketError?.message || "Failed to create new ticket" };
  }

  // Add note to order
  const { data: order } = await supabase.from("orders").select("notes").eq("id", input.orderId).single();
  const existingNotes = order?.notes || "";
  const newNote = `Reissued ticket ${input.oldTicketId.slice(0, 8)} → ${newTicket.id.slice(0, 8)}: ${input.reason}`;
  await supabase
    .from("orders")
    .update({ notes: existingNotes ? `${existingNotes}\n${newNote}` : newNote })
    .eq("id", input.orderId);

  revalidatePath(`/dashboard/events/${oldTicket.event_id}`);
  return { success: true, data: { newTicketId: newTicket.id } };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEND TICKETS TO EMAIL (Admin)
// ═══════════════════════════════════════════════════════════════════════════

export async function adminSendTicketsToEmail(input: {
  ticketIds: string[];
  recipientEmail: string;
  recipientName: string;
}): Promise<ActionResult<{ sent: number }>> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  if (!input.ticketIds.length) return { success: false, error: "No tickets selected" };

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, qr_code_secret, event_id, tier_id, status")
    .in("id", input.ticketIds);

  if (!tickets || tickets.length === 0) return { success: false, error: "Tickets not found" };

  const validTickets = tickets.filter((t) => t.status === "valid");
  if (validTickets.length === 0) return { success: false, error: "No valid tickets to send" };

  const eventIds = [...new Set(validTickets.map((t) => t.event_id))];
  const { data: events } = await supabase
    .from("events")
    .select("id, title, venue_name, city, currency")
    .in("id", eventIds);

  if (!events || events.length === 0) return { success: false, error: "Event not found" };

  const tierIds = [...new Set(validTickets.map((t) => t.tier_id))];
  const { data: tiers } = await supabase.from("ticket_tiers").select("id, name").in("id", tierIds);
  const tierMap = new Map((tiers || []).map((t) => [t.id, t.name]));

  const event = events[0];

  // Fetch first occurrence for email date
  const { data: firstOcc } = await supabase
    .from("event_occurrences")
    .select("starts_at, ends_at")
    .eq("event_id", event.id)
    .eq("is_cancelled", false)
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const ticketInfos = validTickets.map((t) => ({
    id: t.id,
    qr_code_secret: t.qr_code_secret,
    tierName: tierMap.get(t.tier_id) || "Unknown",
  }));

  try {
    await sendTicketEmail({
      to: input.recipientEmail,
      attendeeName: input.recipientName,
      tickets: ticketInfos,
      eventTitle: event.title,
      eventDate: firstOcc?.starts_at || "",
      eventEndDate: firstOcc?.ends_at || undefined,
      venueName: event.venue_name || "",
      city: event.city || "",
    });
  } catch (err) {
    console.error("Failed to send ticket email:", err);
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { success: false, error: message };
  }

  return { success: true, data: { sent: validTickets.length } };
}
