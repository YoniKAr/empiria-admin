import { getDashboardKpis, getOrders, getEvents } from "@/lib/actions";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const [kpis, recentOrders, recentEvents] = await Promise.all([
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
      }}
    />
  );
}
