"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "./supabase";
import { requireAdmin } from "./admin-guard";
import { getStripe } from "./stripe";
import { toStripeAmount } from "./utils";
import { sendTicketCancellationEmail } from "./email";
import type {
  EventStatus,
  UserRole,
  OrderStatus,
  TicketStatus,
  DashboardKpis,
  RevenueDataPoint,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Helpers ───

async function adminGuard() {
  return await requireAdmin();
}

function db() {
  return getSupabaseAdmin();
}

// ═══════════════════════════════════════════
//  DASHBOARD KPIs
// ═══════════════════════════════════════════

export async function getDashboardKpis(): Promise<DashboardKpis> {
  await adminGuard();
  const supabase = db();

  const [ordersRes, usersRes, eventsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("total_amount, platform_fee_amount, currency")
      .eq("status", "completed"),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("events")
      .select("id, total_tickets_sold", { count: "exact" })
      .is("deleted_at", null),
  ]);

  const orders: any[] = ordersRes.data ?? [];
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
  const platformFees = orders.reduce((sum: number, o: any) => sum + Number(o.platform_fee_amount), 0);
  const events: any[] = eventsRes.data ?? [];
  const totalTicketsSold = events.reduce(
    (sum: number, e: any) => sum + (e.total_tickets_sold ?? 0),
    0
  );

  return {
    totalRevenue,
    platformFees,
    totalOrders: orders.length,
    totalUsers: usersRes.count ?? 0,
    totalEvents: eventsRes.count ?? 0,
    totalTicketsSold,
    currency: "cad",
  };
}

export async function getRevenueTimeSeries(days = 30): Promise<RevenueDataPoint[]> {
  await adminGuard();
  const supabase = db();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("orders")
    .select("total_amount, platform_fee_amount, created_at")
    .eq("status", "completed")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const orders: any[] = data ?? [];
  const map = new Map<string, { revenue: number; platformFees: number; orders: number }>();
  for (const o of orders) {
    const date = o.created_at.slice(0, 10);
    const existing = map.get(date) ?? { revenue: 0, platformFees: 0, orders: 0 };
    existing.revenue += Number(o.total_amount);
    existing.platformFees += Number(o.platform_fee_amount);
    existing.orders += 1;
    map.set(date, existing);
  }

  return Array.from(map.entries()).map(([date, d]) => ({ date, ...d }));
}

// ═══════════════════════════════════════════
//  EVENTS
// ═══════════════════════════════════════════

export async function getEvents(filters?: {
  status?: EventStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  await adminGuard();
  const supabase = db();
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("events")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const events: any[] = data ?? [];
  const organizerIds = [...new Set(events.map((e: any) => e.organizer_id))];

  let organizers: any[] = [];
  if (organizerIds.length > 0) {
    const { data: orgData } = await supabase
      .from("users")
      .select("auth0_id, full_name, email")
      .in("auth0_id", organizerIds);
    organizers = orgData ?? [];
  }

  const orgMap = new Map(organizers.map((o: any) => [o.auth0_id, o]));

  // Batch-fetch first occurrence per event for display
  const eventIds = events.map((e: any) => e.id);
  const occurrenceMap = new Map<string, any>();
  if (eventIds.length > 0) {
    const { data: occData } = await supabase
      .from("event_occurrences")
      .select("event_id, starts_at")
      .in("event_id", eventIds)
      .eq("is_cancelled", false)
      .order("starts_at", { ascending: true });
    for (const occ of (occData ?? []) as any[]) {
      if (!occurrenceMap.has(occ.event_id)) {
        occurrenceMap.set(occ.event_id, occ);
      }
    }
  }

  const enriched = events.map((e: any) => ({
    ...e,
    organizer: orgMap.get(e.organizer_id) ?? null,
    first_occurrence: occurrenceMap.get(e.id) ?? null,
  }));

  return { events: enriched, total: count ?? 0 };
}

export async function getEventById(id: string) {
  await adminGuard();
  const supabase = db();

  const [eventRes, tiersRes, ordersRes, occurrencesRes] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase
      .from("ticket_tiers")
      .select("*")
      .eq("event_id", id)
      .order("price", { ascending: true }),
    supabase
      .from("orders")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("event_occurrences")
      .select("*")
      .eq("event_id", id)
      .order("starts_at", { ascending: true }),
  ]);

  if (eventRes.error) throw new Error(eventRes.error.message);

  const event: any = eventRes.data;

  let organizer: any = null;
  if (event.organizer_id) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("auth0_id", event.organizer_id)
      .single();
    organizer = data;
  }

  return {
    event: { ...event, organizer },
    tiers: tiersRes.data ?? [],
    orders: ordersRes.data ?? [],
    occurrences: occurrencesRes.data ?? [],
  };
}

export async function updateEventStatus(eventId: string, status: EventStatus) {
  await adminGuard();
  const { error } = await db().from("events").update({ status }).eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function toggleEventFeatured(eventId: string, isFeatured: boolean) {
  await adminGuard();
  const { error } = await db().from("events").update({ is_featured: isFeatured }).eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function updatePlatformFee(
  eventId: string,
  feePercent: number,
  feeFixed: number,
  passProcessingFee?: boolean
) {
  await adminGuard();
  const updatePayload: Record<string, unknown> = {
    platform_fee_percent: feePercent,
    platform_fee_fixed: feeFixed,
  };
  if (passProcessingFee !== undefined) {
    updatePayload.pass_processing_fee = passProcessingFee;
  }
  const { error } = await db()
    .from("events")
    .update(updatePayload)
    .eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}`);
}

// ═══════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════

export async function getUsers(filters?: {
  role?: UserRole;
  search?: string;
  page?: number;
  limit?: number;
}) {
  await adminGuard();
  const supabase = db();
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.role) query = query.eq("role", filters.role);
  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { users: data ?? [], total: count ?? 0 };
}

export async function getUserById(id: string) {
  await adminGuard();
  const supabase = db();

  const { data: user, error } = await supabase.from("users").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);

  const u: any = user;

  const [eventsRes, ordersRes] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("organizer_id", u.auth0_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", u.auth0_id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const orders: any[] = ordersRes.data ?? [];
  const eventIds = [...new Set(orders.map((o: any) => o.event_id))];
  const eventTitles = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: evData } = await supabase.from("events").select("id, title").in("id", eventIds);
    for (const e of (evData ?? []) as any[]) {
      eventTitles.set(e.id, e.title);
    }
  }
  const enrichedOrders = orders.map((o: any) => ({
    ...o,
    event: { id: o.event_id, title: eventTitles.get(o.event_id) ?? "Unknown" },
  }));

  // Batch-fetch first occurrence per event
  const userEvents: any[] = eventsRes.data ?? [];
  const userEventIds = userEvents.map((e: any) => e.id);
  const occMap = new Map<string, any>();
  if (userEventIds.length > 0) {
    const { data: occData } = await supabase
      .from("event_occurrences")
      .select("event_id, starts_at")
      .in("event_id", userEventIds)
      .eq("is_cancelled", false)
      .order("starts_at", { ascending: true });
    for (const occ of (occData ?? []) as any[]) {
      if (!occMap.has(occ.event_id)) {
        occMap.set(occ.event_id, occ);
      }
    }
  }
  const enrichedEvents = userEvents.map((e: any) => ({
    ...e,
    first_occurrence: occMap.get(e.id) ?? null,
  }));

  return { user: u, events: enrichedEvents, orders: enrichedOrders };
}

export async function updateUserRole(userId: string, role: UserRole) {
  await adminGuard();
  const { error } = await db().from("users").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function softDeleteUser(userId: string) {
  await adminGuard();
  const { error } = await db()
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/users");
}

// ═══════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════

export async function getOrders(filters?: {
  status?: OrderStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  await adminGuard();
  const supabase = db();
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    query = query.or(
      `stripe_payment_intent_id.ilike.%${filters.search}%,stripe_checkout_session_id.ilike.%${filters.search}%`
    );
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const orders: any[] = data ?? [];

  const eventIds = [...new Set(orders.map((o: any) => o.event_id))];
  const userIds = [...new Set(orders.map((o: any) => o.user_id))];

  const eventMap = new Map<string, any>();
  const buyerMap = new Map<string, any>();

  if (eventIds.length > 0) {
    const { data: evData } = await supabase.from("events").select("id, title, slug").in("id", eventIds);
    for (const e of (evData ?? []) as any[]) eventMap.set(e.id, e);
  }
  if (userIds.length > 0) {
    const { data: uData } = await supabase.from("users").select("id, auth0_id, full_name, email").in("auth0_id", userIds);
    for (const u of (uData ?? []) as any[]) buyerMap.set(u.auth0_id, u);
  }

  const enriched = orders.map((o: any) => ({
    ...o,
    event: eventMap.get(o.event_id) ?? null,
    buyer: buyerMap.get(o.user_id) ?? null,
  }));

  return { orders: enriched, total: count ?? 0 };
}

export async function getOrderById(id: string) {
  await adminGuard();
  const supabase = db();

  const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);

  const o: any = order;

  const [eventRes, buyerRes, itemsRes, ticketsRes] = await Promise.all([
    supabase.from("events").select("*").eq("id", o.event_id).single(),
    supabase.from("users").select("*").eq("auth0_id", o.user_id).single(),
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("tickets").select("*").eq("order_id", id),
  ]);

  const items: any[] = itemsRes.data ?? [];
  const tierIds = [...new Set(items.map((i: any) => i.tier_id))];
  const tierMap = new Map<string, any>();
  if (tierIds.length > 0) {
    const { data: tData } = await supabase.from("ticket_tiers").select("*").in("id", tierIds);
    for (const t of (tData ?? []) as any[]) tierMap.set(t.id, t);
  }
  const enrichedItems = items.map((i: any) => ({ ...i, tier: tierMap.get(i.tier_id) ?? null }));

  return {
    order: {
      ...o,
      event: eventRes.data ?? null,
      buyer: buyerRes.data ?? null,
    },
    items: enrichedItems,
    tickets: ticketsRes.data ?? [],
  };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await adminGuard();
  const { error } = await db().from("orders").update({ status }).eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
}

// ═══════════════════════════════════════════
//  TICKETS
// ═══════════════════════════════════════════

export async function getTickets(filters?: {
  status?: TicketStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  await adminGuard();
  const supabase = db();
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("tickets")
    .select("*", { count: "exact" })
    .order("purchase_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    query = query.or(
      `qr_code_secret.ilike.%${filters.search}%,attendee_email.ilike.%${filters.search}%,attendee_name.ilike.%${filters.search}%`
    );
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const tickets: any[] = data ?? [];

  const eventIds = [...new Set(tickets.map((t: any) => t.event_id))];
  const tierIds = [...new Set(tickets.map((t: any) => t.tier_id))];

  const eventMap = new Map<string, any>();
  const tierMap = new Map<string, any>();

  if (eventIds.length > 0) {
    const { data: evData } = await supabase.from("events").select("id, title").in("id", eventIds);
    for (const e of (evData ?? []) as any[]) eventMap.set(e.id, e);
  }
  if (tierIds.length > 0) {
    const { data: tData } = await supabase.from("ticket_tiers").select("id, name, price, currency").in("id", tierIds);
    for (const t of (tData ?? []) as any[]) tierMap.set(t.id, t);
  }

  const enriched = tickets.map((t: any) => ({
    ...t,
    event: eventMap.get(t.event_id) ?? null,
    tier: tierMap.get(t.tier_id) ?? null,
  }));

  return { tickets: enriched, total: count ?? 0 };
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  await adminGuard();
  const { error } = await db().from("tickets").update({ status }).eq("id", ticketId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/tickets");
}

// ═══════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════

export async function getCategories() {
  await adminGuard();
  const { data, error } = await db().from("categories").select("*").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCategory(name: string, slug: string) {
  await adminGuard();
  const { error } = await db().from("categories").insert({ name, slug });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/categories");
}

export async function toggleCategoryActive(categoryId: string, isActive: boolean) {
  await adminGuard();
  const { error } = await db().from("categories").update({ is_active: isActive }).eq("id", categoryId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/categories");
}

// ═══════════════════════════════════════════
//  REVENUE (detailed breakdown)
// ═══════════════════════════════════════════

export async function getRevenueByEvent() {
  await adminGuard();
  const supabase = db();

  const { data, error } = await supabase
    .from("orders")
    .select("event_id, total_amount, platform_fee_amount, organizer_payout_amount, currency")
    .eq("status", "completed");

  if (error) throw new Error(error.message);

  const orders: any[] = data ?? [];

  const eventIds = [...new Set(orders.map((o: any) => o.event_id))];
  const eventMap = new Map<string, any>();
  if (eventIds.length > 0) {
    const { data: evData } = await supabase.from("events").select("id, title, organizer_id").in("id", eventIds);
    for (const e of (evData ?? []) as any[]) eventMap.set(e.id, e);
  }

  const map = new Map<
    string,
    {
      eventId: string;
      eventTitle: string;
      organizerId: string;
      totalRevenue: number;
      platformFees: number;
      organizerPayout: number;
      orderCount: number;
      currency: string;
    }
  >();

  for (const row of orders) {
    const event = eventMap.get(row.event_id);
    const existing = map.get(row.event_id) ?? {
      eventId: row.event_id,
      eventTitle: event?.title ?? "Unknown",
      organizerId: event?.organizer_id ?? "",
      totalRevenue: 0,
      platformFees: 0,
      organizerPayout: 0,
      orderCount: 0,
      currency: row.currency,
    };
    existing.totalRevenue += Number(row.total_amount);
    existing.platformFees += Number(row.platform_fee_amount);
    existing.organizerPayout += Number(row.organizer_payout_amount);
    existing.orderCount += 1;
    map.set(row.event_id, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// ═══════════════════════════════════════════
//  GLOBAL SEARCH
// ═══════════════════════════════════════════

export async function globalSearch(query: string) {
  await adminGuard();
  const supabase = db();
  
  if (!query || query.trim().length <= 1) return { events: [], users: [], orders: [] };

  const searchStr = `%${query.trim()}%`;
  
  const [eventsRes, usersRes, ordersRes] = await Promise.all([
    supabase.from("events").select("id, title, status").is("deleted_at", null).ilike("title", searchStr).limit(5),
    supabase.from("users").select("id, full_name, email").is("deleted_at", null).or(`full_name.ilike.${searchStr},email.ilike.${searchStr}`).limit(5),
    supabase.from("orders").select("id, stripe_payment_intent_id, status").or(`stripe_payment_intent_id.ilike.${searchStr},stripe_checkout_session_id.ilike.${searchStr}`).limit(5)
  ]);

  return {
    events: eventsRes.data ?? [],
    users: usersRes.data ?? [],
    orders: ordersRes.data ?? []
  };
}

export async function updateAdminProfile(formData: FormData) {
  const user = await adminGuard();
  const supabase = db();

  const firstName = formData.get("first_name") as string;
  const lastName = formData.get("last_name") as string;
  const avatarUrl = formData.get("avatar_url") as string;

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  const updateData: Record<string, string | null> = {};
  if (fullName !== null) updateData.full_name = fullName;
  if (avatarUrl !== undefined && avatarUrl !== null) updateData.avatar_url = avatarUrl;

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

// ═══════════════════════════════════════════
//  EVENT IMAGE UPLOADS
// ═══════════════════════════════════════════

type ImageUploadResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function uploadEventCoverImage(
  formData: FormData
): Promise<ImageUploadResult<{ cover_image_url: string }>> {
  const admin = await adminGuard();

  const file = formData.get("cover_image") as File | null;
  if (!file || file.size === 0) return { success: false, error: "No file provided" };

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "File must be a JPEG, PNG, WebP, or GIF image" };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File must be under 5 MB" };
  }

  const supabase = db();
  const ext = file.name.split(".").pop() ?? "jpg";
  const safeSub = admin.auth0_id.replace(/\|/g, "_");
  const uniqueId = crypto.randomUUID();
  const path = `${safeSub}/${uniqueId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("Cover_image")
    .upload(path, file, { contentType: file.type });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("Cover_image").getPublicUrl(path);

  const cover_image_url = `${publicUrlData.publicUrl}?t=${Date.now()}`;

  return { success: true, data: { cover_image_url } };
}

export async function uploadEventGalleryImage(
  formData: FormData
): Promise<ImageUploadResult<{ photo_url: string }>> {
  const admin = await adminGuard();

  const file = formData.get("gallery_image") as File | null;
  if (!file || file.size === 0) return { success: false, error: "No file provided" };

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "File must be a JPEG, PNG, WebP, or GIF image" };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File must be under 5 MB" };
  }

  const supabase = db();
  const ext = file.name.split(".").pop() ?? "jpg";
  const safeSub = admin.auth0_id.replace(/\|/g, "_");
  const uniqueId = crypto.randomUUID();
  const path = `${safeSub}/${uniqueId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("events_gallery")
    .upload(path, file, { contentType: file.type });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("events_gallery").getPublicUrl(path);

  const photo_url = `${publicUrlData.publicUrl}?t=${Date.now()}`;

  return { success: true, data: { photo_url } };
}

// ═══════════════════════════════════════════
//  CANCEL TICKET WITH REFUND (Admin)
// ═══════════════════════════════════════════

export async function adminCancelTicketWithRefund(
  ticketId: string,
  reason: string,
  releaseToPool: boolean
): Promise<ActionResult<{ refundId: string }>> {
  await adminGuard();

  if (!reason.trim()) return { success: false, error: "A cancellation reason is required" };

  const supabase = db();
  const stripe = getStripe();

  // Fetch ticket
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status, attendee_name, attendee_email, event_id, tier_id, order_id")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) return { success: false, error: "Ticket not found" };
  if (ticket.status !== "valid") return { success: false, error: `Cannot cancel a ticket with status "${ticket.status}"` };

  // Fetch event for email
  const { data: event } = await supabase
    .from("events")
    .select("id, title, venue_name, city")
    .eq("id", ticket.event_id)
    .single();

  if (!event) return { success: false, error: "Event not found" };

  // Fetch first occurrence for email date
  const { data: cancelOcc } = await supabase
    .from("event_occurrences")
    .select("starts_at")
    .eq("event_id", ticket.event_id)
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Fetch order + payout breakdown
  const { data: order } = await supabase
    .from("orders")
    .select("stripe_payment_intent_id, currency, payout_breakdown")
    .eq("id", ticket.order_id)
    .single();

  if (!order?.stripe_payment_intent_id) {
    return { success: false, error: "No payment found for this ticket" };
  }

  // Fetch tier
  const { data: tier } = await supabase
    .from("ticket_tiers")
    .select("name, price, currency")
    .eq("id", ticket.tier_id)
    .single();

  if (!tier) return { success: false, error: "Ticket tier not found" };

  const currency = tier.currency || order.currency || "cad";
  const refundAmountStripe = toStripeAmount(tier.price, currency);

  // Create Stripe refund + reverse transfers
  let refundId: string;
  try {
    const breakdown = order.payout_breakdown as any;

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: refundAmountStripe,
      reason: "requested_by_customer",
    });
    refundId = refund.id;

    const refundRatio = tier.price / (breakdown.subtotal || tier.price);

    if (breakdown.organizer_transfer_id) {
      const reversalAmount = Math.round(breakdown.organizer_payout * refundRatio * 100);
      if (reversalAmount > 0) {
        try {
          await stripe.transfers.createReversal(breakdown.organizer_transfer_id, { amount: reversalAmount });
        } catch (revErr) {
          console.error("Failed to reverse organizer transfer:", revErr);
        }
      }
    }

    if (breakdown.splits) {
      for (const split of breakdown.splits) {
        if (split.stripe_transfer_id) {
          const reversalAmount = Math.round(split.amount * refundRatio * 100);
          if (reversalAmount > 0) {
            try {
              await stripe.transfers.createReversal(split.stripe_transfer_id, { amount: reversalAmount });
            } catch (revErr) {
              console.error(`Failed to reverse split transfer ${split.stripe_transfer_id}:`, revErr);
            }
          }
        }
      }
    }

    if (breakdown.elevsoft_transfer?.stripe_transfer_id) {
      const reversalAmount = Math.round(breakdown.elevsoft_transfer.amount * refundRatio * 100);
      if (reversalAmount > 0) {
        try {
          await stripe.transfers.createReversal(breakdown.elevsoft_transfer.stripe_transfer_id, { amount: reversalAmount });
        } catch (revErr) {
          console.error("Failed to reverse Elevsoft transfer:", revErr);
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe refund failed";
    console.error("Stripe refund error:", err);
    return { success: false, error: message };
  }

  const newStatus = releaseToPool ? "refunded" : "cancelled";

  await supabase.from("tickets").update({ status: newStatus }).eq("id", ticketId);

  if (releaseToPool) {
    const { data: currentTier } = await supabase
      .from("ticket_tiers")
      .select("remaining_quantity")
      .eq("id", ticket.tier_id)
      .single();

    if (currentTier) {
      await supabase
        .from("ticket_tiers")
        .update({ remaining_quantity: currentTier.remaining_quantity + 1 })
        .eq("id", ticket.tier_id);
    }

    const { data: currentEvent } = await supabase
      .from("events")
      .select("total_tickets_sold")
      .eq("id", ticket.event_id)
      .single();

    if (currentEvent) {
      await supabase
        .from("events")
        .update({ total_tickets_sold: Math.max(0, currentEvent.total_tickets_sold - 1) })
        .eq("id", ticket.event_id);
    }
  }

  // Send cancellation email
  try {
    await sendTicketCancellationEmail({
      to: ticket.attendee_email,
      attendeeName: ticket.attendee_name,
      eventTitle: event.title,
      eventDate: cancelOcc?.starts_at || "",
      venueName: event.venue_name || "",
      city: event.city || "",
      tierName: tier.name,
      reason: reason.trim(),
      refundAmount: tier.price,
      currency,
    });
  } catch (emailErr) {
    console.error("Failed to send cancellation email:", emailErr);
  }

  revalidatePath("/dashboard/tickets");
  revalidatePath(`/dashboard/orders`);
  return { success: true, data: { refundId } };
}

// ═══════════════════════════════════════════
//  CANCEL ORDER WITH REFUND (Admin)
// ═══════════════════════════════════════════

export async function adminCancelOrderWithRefund(
  orderId: string,
  reason: string,
  releaseToPool: boolean,
  ticketIds?: string[]
): Promise<ActionResult<{ refundedCount: number; totalRefund: number }>> {
  await adminGuard();

  if (!reason.trim()) return { success: false, error: "A cancellation reason is required" };

  const supabase = db();
  const stripe = getStripe();

  // Fetch order
  const { data: order } = await supabase
    .from("orders")
    .select("id, event_id, stripe_payment_intent_id, currency, payout_breakdown")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Order not found" };
  if (!order.stripe_payment_intent_id) return { success: false, error: "No payment found for this order" };

  // Fetch event for email
  const { data: event } = await supabase
    .from("events")
    .select("id, title, venue_name, city")
    .eq("id", order.event_id)
    .single();

  if (!event) return { success: false, error: "Event not found" };

  // Fetch first occurrence for email date
  const { data: orderOcc } = await supabase
    .from("event_occurrences")
    .select("starts_at")
    .eq("event_id", order.event_id)
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Fetch valid tickets
  let query = supabase
    .from("tickets")
    .select("id, status, attendee_name, attendee_email, tier_id")
    .eq("order_id", orderId)
    .eq("status", "valid");

  if (ticketIds && ticketIds.length > 0) {
    query = query.in("id", ticketIds);
  }

  const { data: ticketsToCancel } = await query;

  if (!ticketsToCancel || ticketsToCancel.length === 0) {
    return { success: false, error: "No valid tickets to cancel in this order" };
  }

  // Fetch tiers
  const tierIds = [...new Set(ticketsToCancel.map((t) => t.tier_id))];
  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select("id, name, price, currency")
    .in("id", tierIds);

  const tierMap = new Map((tiers || []).map((t) => [t.id, t]));

  // Calculate refund
  let totalRefundDisplay = 0;
  let totalRefundStripe = 0;
  for (const t of ticketsToCancel) {
    const tier = tierMap.get(t.tier_id);
    if (tier) {
      const curr = tier.currency || order.currency || "cad";
      totalRefundDisplay += tier.price;
      totalRefundStripe += toStripeAmount(tier.price, curr);
    }
  }

  // Stripe refund + transfer reversals
  try {
    const breakdown = order.payout_breakdown as any;

    await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: totalRefundStripe,
      reason: "requested_by_customer",
    });

    const refundRatio = totalRefundDisplay / (breakdown.subtotal || totalRefundDisplay);

    if (breakdown.organizer_transfer_id) {
      const reversalAmount = Math.round(breakdown.organizer_payout * refundRatio * 100);
      if (reversalAmount > 0) {
        try {
          await stripe.transfers.createReversal(breakdown.organizer_transfer_id, { amount: reversalAmount });
        } catch (revErr) {
          console.error("Failed to reverse organizer transfer:", revErr);
        }
      }
    }

    if (breakdown.splits) {
      for (const split of breakdown.splits) {
        if (split.stripe_transfer_id) {
          const reversalAmount = Math.round(split.amount * refundRatio * 100);
          if (reversalAmount > 0) {
            try {
              await stripe.transfers.createReversal(split.stripe_transfer_id, { amount: reversalAmount });
            } catch (revErr) {
              console.error(`Failed to reverse split transfer ${split.stripe_transfer_id}:`, revErr);
            }
          }
        }
      }
    }

    if (breakdown.elevsoft_transfer?.stripe_transfer_id) {
      const reversalAmount = Math.round(breakdown.elevsoft_transfer.amount * refundRatio * 100);
      if (reversalAmount > 0) {
        try {
          await stripe.transfers.createReversal(breakdown.elevsoft_transfer.stripe_transfer_id, { amount: reversalAmount });
        } catch (revErr) {
          console.error("Failed to reverse Elevsoft transfer:", revErr);
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe refund failed";
    console.error("Stripe refund error:", err);
    return { success: false, error: message };
  }

  const newStatus = releaseToPool ? "refunded" : "cancelled";
  const cancelledIds = ticketsToCancel.map((t) => t.id);

  await supabase.from("tickets").update({ status: newStatus }).in("id", cancelledIds);

  if (releaseToPool) {
    const tierCounts = new Map<string, number>();
    for (const t of ticketsToCancel) {
      tierCounts.set(t.tier_id, (tierCounts.get(t.tier_id) || 0) + 1);
    }

    for (const [tierId, count] of tierCounts) {
      const { data: currentTier } = await supabase
        .from("ticket_tiers")
        .select("remaining_quantity")
        .eq("id", tierId)
        .single();

      if (currentTier) {
        await supabase
          .from("ticket_tiers")
          .update({ remaining_quantity: currentTier.remaining_quantity + count })
          .eq("id", tierId);
      }
    }

    const { data: currentEvent } = await supabase
      .from("events")
      .select("total_tickets_sold")
      .eq("id", event.id)
      .single();

    if (currentEvent) {
      await supabase
        .from("events")
        .update({ total_tickets_sold: Math.max(0, currentEvent.total_tickets_sold - ticketsToCancel.length) })
        .eq("id", event.id);
    }
  }

  // Send cancellation emails — one per unique attendee
  const attendeeEmails = new Map<string, { name: string; tierNames: string[] }>();
  for (const t of ticketsToCancel) {
    const existing = attendeeEmails.get(t.attendee_email);
    const tierName = tierMap.get(t.tier_id)?.name || "Unknown";
    if (existing) {
      existing.tierNames.push(tierName);
    } else {
      attendeeEmails.set(t.attendee_email, { name: t.attendee_name, tierNames: [tierName] });
    }
  }

  const currency = order.currency || "cad";
  for (const [email, { name, tierNames }] of attendeeEmails) {
    const attendeeTickets = ticketsToCancel.filter((t) => t.attendee_email === email);
    let attendeeRefund = 0;
    for (const t of attendeeTickets) {
      const tier = tierMap.get(t.tier_id);
      if (tier) attendeeRefund += tier.price;
    }

    try {
      await sendTicketCancellationEmail({
        to: email,
        attendeeName: name,
        eventTitle: event.title,
        eventDate: orderOcc?.starts_at || "",
        venueName: event.venue_name || "",
        city: event.city || "",
        tierName: tierNames.join(", "),
        reason: reason.trim(),
        refundAmount: attendeeRefund,
        currency,
      });
    } catch (emailErr) {
      console.error("Failed to send cancellation email to", email, emailErr);
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  return { success: true, data: { refundedCount: ticketsToCancel.length, totalRefund: totalRefundDisplay } };
}

// ═══════════════════════════════════════════
//  DELETE / CANCEL EVENT WITH REFUNDS (Admin)
// ═══════════════════════════════════════════

export async function adminDeleteEvent(
  eventId: string,
  reason?: string,
  releaseToPool?: boolean
): Promise<ActionResult<{ id: string; mode: "deleted" | "cancelled" }>> {
  await adminGuard();
  const supabase = db();
  const stripe = getStripe();

  const { data: event } = await supabase
    .from("events")
    .select("id, status, title, venue_name, city, total_tickets_sold")
    .eq("id", eventId)
    .single();

  if (!event) return { success: false, error: "Event not found" };

  // Fetch first occurrence for email date
  const { data: firstOcc } = await supabase
    .from("event_occurrences")
    .select("starts_at")
    .eq("event_id", eventId)
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const eventDateForEmail = firstOcc?.starts_at || "";

  // Check if any tickets were ever issued
  const { count: ticketCount } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const hasTickets = (ticketCount || 0) > 0;

  if (!hasTickets) {
    // No tickets — hard delete
    await supabase.from("ticket_tiers").delete().eq("event_id", eventId);
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/events");
    return { success: true, data: { id: eventId, mode: "deleted" } };
  }

  // Tickets exist — refund all valid ones, then cancel event
  if (!reason?.trim()) {
    return { success: false, error: "A cancellation reason is required when tickets have been issued" };
  }

  // Find all valid tickets grouped by order
  const { data: validTickets } = await supabase
    .from("tickets")
    .select("id, order_id, attendee_name, attendee_email, tier_id")
    .eq("event_id", eventId)
    .eq("status", "valid");

  if (validTickets && validTickets.length > 0) {
    const orderGroups = new Map<string, typeof validTickets>();
    for (const t of validTickets) {
      if (!t.order_id) continue;
      const group = orderGroups.get(t.order_id) || [];
      group.push(t);
      orderGroups.set(t.order_id, group);
    }

    const tierIds = [...new Set(validTickets.map((t) => t.tier_id))];
    const { data: tiers } = await supabase
      .from("ticket_tiers")
      .select("id, name, price, currency")
      .in("id", tierIds);
    const tierMap = new Map((tiers || []).map((t) => [t.id, t]));

    // Process each order
    for (const [orderId, orderTickets] of orderGroups) {
      const { data: order } = await supabase
        .from("orders")
        .select("stripe_payment_intent_id, currency, payout_breakdown")
        .eq("id", orderId)
        .single();

      if (!order?.stripe_payment_intent_id) continue;

      let totalRefundStripe = 0;
      let totalRefundDisplay = 0;
      for (const t of orderTickets) {
        const tier = tierMap.get(t.tier_id);
        if (tier) {
          totalRefundStripe += toStripeAmount(tier.price, tier.currency || order.currency || "cad");
          totalRefundDisplay += tier.price;
        }
      }

      if (totalRefundStripe > 0) {
        try {
          const breakdown = order.payout_breakdown as any;

          await stripe.refunds.create({
            payment_intent: order.stripe_payment_intent_id,
            amount: totalRefundStripe,
            reason: "requested_by_customer",
          });

          const refundRatio = totalRefundDisplay / (breakdown.subtotal || totalRefundDisplay);

          if (breakdown.organizer_transfer_id) {
            const reversalAmount = Math.round(breakdown.organizer_payout * refundRatio * 100);
            if (reversalAmount > 0) {
              try {
                await stripe.transfers.createReversal(breakdown.organizer_transfer_id, { amount: reversalAmount });
              } catch (revErr) {
                console.error(`Failed to reverse organizer transfer for order ${orderId}:`, revErr);
              }
            }
          }

          if (breakdown.splits) {
            for (const split of breakdown.splits) {
              if (split.stripe_transfer_id) {
                const reversalAmount = Math.round(split.amount * refundRatio * 100);
                if (reversalAmount > 0) {
                  try {
                    await stripe.transfers.createReversal(split.stripe_transfer_id, { amount: reversalAmount });
                  } catch (revErr) {
                    console.error(`Failed to reverse split transfer for order ${orderId}:`, revErr);
                  }
                }
              }
            }
          }

          if (breakdown.elevsoft_transfer?.stripe_transfer_id) {
            const reversalAmount = Math.round(breakdown.elevsoft_transfer.amount * refundRatio * 100);
            if (reversalAmount > 0) {
              try {
                await stripe.transfers.createReversal(breakdown.elevsoft_transfer.stripe_transfer_id, { amount: reversalAmount });
              } catch (revErr) {
                console.error(`Failed to reverse Elevsoft transfer for order ${orderId}:`, revErr);
              }
            }
          }
        } catch (err) {
          console.error(`Stripe refund error for order ${orderId}:`, err);
        }
      }
    }

    const newStatus = releaseToPool ? "refunded" : "cancelled";

    await supabase
      .from("tickets")
      .update({ status: newStatus })
      .eq("event_id", eventId)
      .eq("status", "valid");

    if (releaseToPool) {
      const tierIds2 = [...new Set(validTickets.map((t) => t.tier_id))];
      for (const tierId of tierIds2) {
        const count = validTickets.filter((t) => t.tier_id === tierId).length;
        const { data: currentTier } = await supabase
          .from("ticket_tiers")
          .select("remaining_quantity")
          .eq("id", tierId)
          .single();

        if (currentTier) {
          await supabase
            .from("ticket_tiers")
            .update({ remaining_quantity: currentTier.remaining_quantity + count })
            .eq("id", tierId);
        }
      }

      const { data: currentEvent } = await supabase
        .from("events")
        .select("total_tickets_sold")
        .eq("id", eventId)
        .single();

      if (currentEvent) {
        await supabase
          .from("events")
          .update({ total_tickets_sold: Math.max(0, currentEvent.total_tickets_sold - validTickets.length) })
          .eq("id", eventId);
      }
    }

    // Send cancellation emails — one per unique attendee
    const attendeeMap = new Map<string, { name: string; tierNames: string[]; refund: number }>();
    const tierIds3 = [...new Set(validTickets.map((t) => t.tier_id))];
    const { data: emailTiers } = await supabase
      .from("ticket_tiers")
      .select("id, name, price, currency")
      .in("id", tierIds3);
    const emailTierMap = new Map((emailTiers || []).map((t) => [t.id, t]));

    for (const t of validTickets) {
      const tier = emailTierMap.get(t.tier_id);
      const existing = attendeeMap.get(t.attendee_email);
      if (existing) {
        existing.tierNames.push(tier?.name || "Unknown");
        existing.refund += tier?.price || 0;
      } else {
        attendeeMap.set(t.attendee_email, {
          name: t.attendee_name,
          tierNames: [tier?.name || "Unknown"],
          refund: tier?.price || 0,
        });
      }
    }

    const currency = (emailTiers && emailTiers[0]?.currency) || "cad";
    for (const [email, { name, tierNames, refund }] of attendeeMap) {
      try {
        await sendTicketCancellationEmail({
          to: email,
          attendeeName: name,
          eventTitle: event.title,
          eventDate: eventDateForEmail,
          venueName: event.venue_name || "",
          city: event.city || "",
          tierName: tierNames.join(", "),
          reason: reason!.trim(),
          refundAmount: refund,
          currency,
        });
      } catch (emailErr) {
        console.error("Failed to send cancellation email to", email, emailErr);
      }
    }
  }

  // Mark event as cancelled
  await supabase.from("events").update({ status: "cancelled" }).eq("id", eventId);

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: true, data: { id: eventId, mode: "cancelled" } };
}

// ═══════════════════════════════════════════
//  REVENUE SPLITS (Admin)
// ═══════════════════════════════════════════

interface RevenueSplitInput {
  recipientUserId: string;
  recipientStripeId: string;
  recipientName: string;
  percentage: number;
  description: string;
}

export async function adminSaveRevenueSplits(
  eventId: string,
  splits: RevenueSplitInput[]
): Promise<ActionResult<{ count: number }>> {
  await adminGuard();
  const supabase = db();

  // Verify event exists
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .single();

  if (!event) return { success: false, error: "Event not found" };

  // Delete existing splits
  await supabase.from("revenue_splits").delete().eq("event_id", eventId);

  if (splits.length === 0) {
    revalidatePath(`/dashboard/events/${eventId}`);
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

  const { error } = await supabase.from("revenue_splits").insert(splitsToInsert);

  if (error) {
    console.error("Revenue splits insert error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: true, data: { count: splits.length } };
}
