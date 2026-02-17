"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "./supabase";
import { requireAdmin } from "./admin-guard";
import type {
  EventStatus,
  UserRole,
  OrderStatus,
  TicketStatus,
  DashboardKpis,
  RevenueDataPoint,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  const enriched = events.map((e: any) => ({
    ...e,
    organizer: orgMap.get(e.organizer_id) ?? null,
  }));

  return { events: enriched, total: count ?? 0 };
}

export async function getEventById(id: string) {
  await adminGuard();
  const supabase = db();

  const [eventRes, tiersRes, ordersRes] = await Promise.all([
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

export async function updatePlatformFee(eventId: string, feePercent: number, feeFixed: number) {
  await adminGuard();
  const { error } = await db()
    .from("events")
    .update({ platform_fee_percent: feePercent, platform_fee_fixed: feeFixed })
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

  return { user: u, events: eventsRes.data ?? [], orders: enrichedOrders };
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
