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

  const orders = ordersRes.data ?? [];
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const platformFees = orders.reduce((sum, o) => sum + Number(o.platform_fee_amount), 0);
  const totalTicketsSold = (eventsRes.data ?? []).reduce(
    (sum, e) => sum + (e.total_tickets_sold ?? 0),
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

  const { data: orders } = await supabase
    .from("orders")
    .select("total_amount, platform_fee_amount, created_at")
    .eq("status", "completed")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const map = new Map<string, { revenue: number; platformFees: number; orders: number }>();
  for (const o of orders ?? []) {
    const date = o.created_at.slice(0, 10);
    const existing = map.get(date) ?? { revenue: 0, platformFees: 0, orders: 0 };
    existing.revenue += Number(o.total_amount);
    existing.platformFees += Number(o.platform_fee_amount);
    existing.orders += 1;
    map.set(date, existing);
  }

  return Array.from(map.entries()).map(([date, data]) => ({ date, ...data }));
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
    .select("*, organizer:users!events_organizer_id_fkey(*)", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { events: data ?? [], total: count ?? 0 };
}

export async function getEventById(id: string) {
  await adminGuard();
  const supabase = db();

  const [eventRes, tiersRes, ordersRes] = await Promise.all([
    supabase
      .from("events")
      .select("*, organizer:users!events_organizer_id_fkey(*)")
      .eq("id", id)
      .single(),
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
  return { event: eventRes.data, tiers: tiersRes.data ?? [], orders: ordersRes.data ?? [] };
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

  const [eventsRes, ordersRes] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("organizer_id", user.auth0_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("orders")
      .select("*, event:events(id, title)")
      .eq("user_id", user.auth0_id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return { user, events: eventsRes.data ?? [], orders: ordersRes.data ?? [] };
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
    .select(
      "*, event:events(id, title, slug), buyer:users!orders_user_id_fkey(id, full_name, email)",
      { count: "exact" }
    )
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
  return { orders: data ?? [], total: count ?? 0 };
}

export async function getOrderById(id: string) {
  await adminGuard();
  const supabase = db();

  const [orderRes, itemsRes, ticketsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*, event:events(*), buyer:users!orders_user_id_fkey(*)")
      .eq("id", id)
      .single(),
    supabase.from("order_items").select("*, tier:ticket_tiers(*)").eq("order_id", id),
    supabase.from("tickets").select("*").eq("order_id", id),
  ]);

  if (orderRes.error) throw new Error(orderRes.error.message);
  return { order: orderRes.data, items: itemsRes.data ?? [], tickets: ticketsRes.data ?? [] };
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
    .select("*, event:events(id, title), tier:ticket_tiers(id, name, price, currency)", {
      count: "exact",
    })
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
  return { tickets: data ?? [], total: count ?? 0 };
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
  const { data, error } = await db()
    .from("orders")
    .select(
      "event_id, total_amount, platform_fee_amount, organizer_payout_amount, currency, event:events(id, title, organizer_id)"
    )
    .eq("status", "completed");

  if (error) throw new Error(error.message);

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

  for (const row of data ?? []) {
    const event = row.event as { id: string; title: string; organizer_id: string } | null;
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
