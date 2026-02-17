import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderById, updateOrderStatus } from "@/lib/actions";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { OrderStatus } from "@/lib/types";
import { ArrowLeft, RefreshCw, Ban, CheckCircle } from "lucide-react";

export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let data;
  try {
    data = await getOrderById(id);
  } catch {
    notFound();
  }

  const { order, items, tickets } = data;
  const event = order.event as any;
  const buyer = order.buyer as any;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/orders" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Order {(order.id as string).slice(0, 8)}…</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-slate-500 text-sm mt-1 font-mono">{order.id}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {order.status === "pending" && (
          <form action={async () => { "use server"; await updateOrderStatus(id, "completed" as OrderStatus); }}>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
              <CheckCircle className="w-4 h-4" /> Mark Completed
            </button>
          </form>
        )}
        {order.status === "completed" && (
          <form action={async () => { "use server"; await updateOrderStatus(id, "refunded" as OrderStatus); }}>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
              <RefreshCw className="w-4 h-4" /> Mark Refunded
            </button>
          </form>
        )}
        {order.status !== "cancelled" && (
          <form action={async () => { "use server"; await updateOrderStatus(id, "cancelled" as OrderStatus); }}>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
              <Ban className="w-4 h-4" /> Cancel
            </button>
          </form>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Payment Details</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-500">Total Amount</dt><dd className="text-lg font-bold text-slate-900">{formatCurrency(Number(order.total_amount), order.currency)}</dd></div>
            <div><dt className="text-slate-500">Platform Fee</dt><dd className="text-lg font-bold text-emerald-600">{formatCurrency(Number(order.platform_fee_amount), order.currency)}</dd></div>
            <div><dt className="text-slate-500">Organizer Payout</dt><dd className="font-medium text-slate-900">{formatCurrency(Number(order.organizer_payout_amount), order.currency)}</dd></div>
            <div><dt className="text-slate-500">Currency</dt><dd className="uppercase text-slate-900">{order.currency}</dd></div>
            <div><dt className="text-slate-500">Stripe Payment Intent</dt><dd className="font-mono text-xs text-slate-900 break-all">{order.stripe_payment_intent_id ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Stripe Checkout Session</dt><dd className="font-mono text-xs text-slate-900 break-all">{order.stripe_checkout_session_id ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Created</dt><dd className="text-slate-900">{formatDateTime(order.created_at)}</dd></div>
            <div><dt className="text-slate-500">Source App</dt><dd className="text-slate-900">{order.source_app ?? "—"}</dd></div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h2 className="font-semibold text-slate-900">Buyer</h2>
            {buyer ? (
              <div className="text-sm space-y-1">
                <p className="font-medium text-slate-900">{buyer.full_name as string}</p>
                <p className="text-slate-500">{buyer.email as string}</p>
                <Link href={`/dashboard/users/${buyer.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">View profile →</Link>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Unknown buyer</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h2 className="font-semibold text-slate-900">Event</h2>
            {event ? (
              <div className="text-sm space-y-1">
                <p className="font-medium text-slate-900">{event.title as string}</p>
                <Link href={`/dashboard/events/${event.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">View event →</Link>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Unknown event</p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Line Items ({items.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Tier</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Unit Price</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Qty</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item: any) => {
                const tier = item.tier as any;
                return (
                  <tr key={item.id as string}>
                    <td className="px-6 py-3 font-medium text-slate-900">{tier?.name ?? "Unknown"}</td>
                    <td className="px-6 py-3 text-slate-600">{formatCurrency(Number(item.unit_price), order.currency)}</td>
                    <td className="px-6 py-3 text-slate-600">{item.quantity as number}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{formatCurrency(Number(item.subtotal), order.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tickets */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Tickets ({tickets.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">QR Code</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Attendee</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Seat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((t: any) => (
                <tr key={t.id as string}>
                  <td className="px-6 py-3 font-mono text-xs text-slate-600">{(t.qr_code_secret as string).slice(0, 12)}…</td>
                  <td className="px-6 py-3 text-slate-900">{(t.attendee_name as string) ?? (t.attendee_email as string) ?? "—"}</td>
                  <td className="px-6 py-3"><StatusBadge status={t.status as string} /></td>
                  <td className="px-6 py-3 text-slate-600">{(t.seat_label as string) ?? "GA"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
