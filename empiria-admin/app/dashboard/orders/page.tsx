import Link from "next/link";
import { getOrders } from "@/lib/actions";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import SearchFilter from "@/components/SearchFilter";
import Pagination from "@/components/Pagination";
import type { OrderStatus } from "@/lib/types";

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Refunded", value: "refunded" },
  { label: "Cancelled", value: "cancelled" },
];

export default async function OrdersPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const status = searchParams.status as OrderStatus | undefined;
  const search = searchParams.search;

  const { orders, total } = await getOrders({ status, search, page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-slate-500 text-sm mt-1">{total} order{total !== 1 ? "s" : ""} total</p>
      </div>

      <SearchFilter placeholder="Search by Stripe ID…" filterKey="status" filterOptions={STATUS_OPTIONS} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Order</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Buyer</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Event</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Platform Fee</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Organizer Payout</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order: any) => {
                const event = order.event as any;
                const buyer = order.buyer as any;
                return (
                  <tr key={order.id as string} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/dashboard/orders/${order.id}`} className="font-mono text-xs text-indigo-600 hover:text-indigo-700">
                        {(order.id as string).slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-900">{buyer?.full_name ?? buyer?.email ?? "—"}</td>
                    <td className="px-6 py-3 text-slate-600 max-w-[160px] truncate">{event?.title ?? "—"}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{formatCurrency(Number(order.total_amount), order.currency as string)}</td>
                    <td className="px-6 py-3 text-emerald-600 font-medium">{formatCurrency(Number(order.platform_fee_amount), order.currency as string)}</td>
                    <td className="px-6 py-3 text-slate-600">{formatCurrency(Number(order.organizer_payout_amount), order.currency as string)}</td>
                    <td className="px-6 py-3"><StatusBadge status={order.status as string} /></td>
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(order.created_at as string)}</td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination total={total} limit={25} page={page} />
    </div>
  );
}
