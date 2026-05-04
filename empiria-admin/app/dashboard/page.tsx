import { getDashboardKpis, getOrders, getEvents } from "@/lib/actions";
import { requireAdmin } from "@/lib/admin-guard";
import { getSupabaseAdmin } from "@/lib/supabase";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const supabase = getSupabaseAdmin();

  const [{ data: profile }, kpis, recentOrders, recentEvents] = await Promise.all([
    supabase.from("users").select("full_name, avatar_url").eq("auth0_id", admin.auth0_id).single(),
    getDashboardKpis(),
    getOrders({ limit: 5 }),
    getEvents({ limit: 5 }),
  ]);

  return (
    <DashboardClient
      data={{
        totalRevenue: kpis.totalRevenue,
        totalUsers: kpis.totalUsers,
        totalOrders: kpis.totalOrders,
        totalEvents: kpis.totalEvents,
        totalTicketsSold: kpis.totalTicketsSold,
        platformFees: kpis.platformFees,
        currency: kpis.currency,
        recentOrders,
        recentEvents: recentEvents.events,
        adminName: profile?.full_name || "Admin",
        adminAvatarUrl: profile?.avatar_url || null,
      }}
    />
  );
}
