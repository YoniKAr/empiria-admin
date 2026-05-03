import { getDashboardKpis, getRevenueTimeSeries, getRevenueByEvent } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { getSupabaseAdmin } from "@/lib/supabase";
import KpiCard from "@/components/KpiCard";
import RevenueChart from "@/components/RevenueChart";
import Collapsible from "@/components/Collapsible";
import PeriodSelector from "./PeriodSelector";
import Link from "next/link";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

const VALID_DAYS = [7, 30, 90, 180, 365];

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = VALID_DAYS.includes(Number(daysParam)) ? Number(daysParam) : 90;

  const [kpis, timeSeries, byEvent] = await Promise.all([
    getDashboardKpis(),
    getRevenueTimeSeries(days),
    getRevenueByEvent(),
  ]);

  // Aggregate revenue by organizer from the byEvent data
  const organizerAgg = new Map<
    string,
    { organizerId: string; eventCount: number; totalRevenue: number; platformFees: number; organizerPayout: number; currency: string }
  >();
  for (const row of byEvent) {
    const key = row.organizerId || "unknown";
    const existing = organizerAgg.get(key) ?? {
      organizerId: key,
      eventCount: 0,
      totalRevenue: 0,
      platformFees: 0,
      organizerPayout: 0,
      currency: row.currency,
    };
    existing.eventCount += 1;
    existing.totalRevenue += row.totalRevenue;
    existing.platformFees += row.platformFees;
    existing.organizerPayout += row.organizerPayout;
    organizerAgg.set(key, existing);
  }

  // Fetch organizer names
  const organizerIds = [...organizerAgg.keys()].filter((id) => id !== "unknown");
  const orgNameMap = new Map<string, { full_name: string; email: string }>();
  if (organizerIds.length > 0) {
    const supabase = getSupabaseAdmin();
    const { data: orgUsers } = await supabase
      .from("users")
      .select("auth0_id, full_name, email")
      .in("auth0_id", organizerIds);
    for (const u of (orgUsers ?? []) as any[]) {
      orgNameMap.set(u.auth0_id, { full_name: u.full_name, email: u.email });
    }
  }

  const byOrganizer = Array.from(organizerAgg.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Revenue</h1>
        <p className="text-slate-500 text-sm mt-1">Platform-wide financial overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Gross Revenue"
          value={formatCurrency(kpis.totalRevenue, kpis.currency)}
          icon={DollarSign}
          className="bg-gradient-to-br from-orange-400 to-amber-500 border-orange-400 [&_.kpi-title]:text-orange-100 [&_.kpi-value]:text-white [&_.kpi-icon]:bg-white/20 [&_.kpi-icon-svg]:text-white"
        />
        <KpiCard
          title="Platform Fees"
          value={formatCurrency(kpis.platformFees, kpis.currency)}
          subtitle="Your earnings"
          icon={TrendingUp}
          className="bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-500 [&_.kpi-title]:text-indigo-100 [&_.kpi-value]:text-white [&_.kpi-icon]:bg-white/20 [&_.kpi-icon-svg]:text-white"
        />
        <KpiCard
          title="Organizer Payouts"
          value={formatCurrency(kpis.totalRevenue - kpis.platformFees, kpis.currency)}
          icon={Wallet}
          className="bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500 [&_.kpi-title]:text-emerald-100 [&_.kpi-value]:text-white [&_.kpi-icon]:bg-white/20 [&_.kpi-icon-svg]:text-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Revenue Trend</h2>
            <p className="text-sm text-slate-500">Last {days} days</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" />Platform Fees</span>
            </div>
            <Suspense>
              <PeriodSelector current={days} />
            </Suspense>
          </div>
        </div>
        <RevenueChart data={timeSeries} />
      </div>

      <Collapsible
        title={
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Revenue by Event</h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {byEvent.length} events
            </span>
          </div>
        }
      >
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
      </Collapsible>

      <Collapsible
        title={
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Revenue by Organizer</h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {byOrganizer.length} organizers
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Organizer</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Events</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Revenue</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Their Payout</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Platform Fees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byOrganizer.map((row) => {
                const org = orgNameMap.get(row.organizerId);
                return (
                  <tr key={row.organizerId} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{org?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-slate-500">{org?.email ?? row.organizerId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{row.eventCount}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{formatCurrency(row.totalRevenue, row.currency)}</td>
                    <td className="px-6 py-3 text-slate-600">{formatCurrency(row.organizerPayout, row.currency)}</td>
                    <td className="px-6 py-3 text-emerald-600 font-medium">{formatCurrency(row.platformFees, row.currency)}</td>
                  </tr>
                );
              })}
              {byOrganizer.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No completed orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Collapsible>
    </div>
  );
}
