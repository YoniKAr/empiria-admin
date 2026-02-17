import {
  DollarSign,
  Users,
  CalendarDays,
  ShoppingCart,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { getDashboardKpis, getRevenueTimeSeries, getOrders } from "@/lib/actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import KpiCard from "@/components/KpiCard";
import RevenueChart from "@/components/RevenueChart";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

export default async function DashboardPage() {
  const [kpis, revenue, recentOrders] = await Promise.all([
    getDashboardKpis(),
    getRevenueTimeSeries(30),
    getOrders({ limit: 5 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Platform overview and key metrics</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Platform Fees Earned"
          value={formatCurrency(kpis.platformFees, kpis.currency)}
          subtitle="Net platform revenue"
          icon={TrendingUp}
        />
        <KpiCard
          title="Gross Revenue"
          value={formatCurrency(kpis.totalRevenue, kpis.currency)}
          subtitle="Total transaction volume"
          icon={DollarSign}
        />
        <KpiCard
          title="Orders"
          value={kpis.totalOrders.toLocaleString()}
          subtitle="Completed orders"
          icon={ShoppingCart}
        />
        <KpiCard
          title="Users"
          value={kpis.totalUsers.toLocaleString()}
          subtitle="Registered accounts"
          icon={Users}
        />
        <KpiCard
          title="Events"
          value={kpis.totalEvents.toLocaleString()}
          subtitle="All-time events"
          icon={CalendarDays}
        />
        <KpiCard
          title="Tickets Sold"
          value={kpis.totalTicketsSold.toLocaleString()}
          subtitle="Total tickets issued"
          icon={Ticket}
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Revenue</h2>
            <p className="text-sm text-slate-500">Last 30 days</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              Total Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              Platform Fees
            </span>
          </div>
        </div>
        <RevenueChart data={revenue} />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
          <Link
            href="/dashboard/orders"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Order</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Event</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fee</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.orders.map((order: Record<string, unknown>) => {
                const event = order.event as { title?: string } | null;
                return (
                  <tr key={order.id as string} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">
                      <Link href={`/dashboard/orders/${order.id}`} className="hover:text-indigo-600">
                        {(order.id as string).slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-900 max-w-[200px] truncate">{event?.title ?? "—"}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {formatCurrency(Number(order.total_amount), order.currency as string)}
                    </td>
                    <td className="px-6 py-3 text-emerald-600 font-medium">
                      {formatCurrency(Number(order.platform_fee_amount), order.currency as string)}
                    </td>
                    <td className="px-6 py-3"><StatusBadge status={order.status as string} /></td>
                    <td className="px-6 py-3 text-slate-500">{formatDateTime(order.created_at as string)}</td>
                  </tr>
                );
              })}
              {recentOrders.orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No orders yet. Seed some test data to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
