import { getDashboardKpis, getRevenueTimeSeries, getRevenueByEvent } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import KpiCard from "@/components/KpiCard";
import RevenueChart from "@/components/RevenueChart";
import Link from "next/link";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";

export default async function RevenuePage() {
  const [kpis, timeSeries, byEvent] = await Promise.all([
    getDashboardKpis(),
    getRevenueTimeSeries(90),
    getRevenueByEvent(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Revenue</h1>
        <p className="text-slate-500 text-sm mt-1">Platform-wide financial overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Gross Revenue" value={formatCurrency(kpis.totalRevenue, kpis.currency)} icon={DollarSign} />
        <KpiCard title="Platform Fees" value={formatCurrency(kpis.platformFees, kpis.currency)} subtitle="Your earnings" icon={TrendingUp} />
        <KpiCard
          title="Organizer Payouts"
          value={formatCurrency(kpis.totalRevenue - kpis.platformFees, kpis.currency)}
          icon={Wallet}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Revenue Trend</h2>
            <p className="text-sm text-slate-500">Last 90 days</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" />Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" />Platform Fees</span>
          </div>
        </div>
        <RevenueChart data={timeSeries} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Revenue by Event</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Event</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Orders</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Revenue</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Platform Fees</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Organizer Payout</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Eff. Fee %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byEvent.map((row) => {
                const effectiveFee = row.totalRevenue > 0 ? ((row.platformFees / row.totalRevenue) * 100).toFixed(1) : "0";
                return (
                  <tr key={row.eventId} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <Link href={`/dashboard/events/${row.eventId}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                        {row.eventTitle}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{row.orderCount}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{formatCurrency(row.totalRevenue, row.currency)}</td>
                    <td className="px-6 py-3 text-emerald-600 font-medium">{formatCurrency(row.platformFees, row.currency)}</td>
                    <td className="px-6 py-3 text-slate-600">{formatCurrency(row.organizerPayout, row.currency)}</td>
                    <td className="px-6 py-3 text-slate-600">{effectiveFee}%</td>
                  </tr>
                );
              })}
              {byEvent.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No completed orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
