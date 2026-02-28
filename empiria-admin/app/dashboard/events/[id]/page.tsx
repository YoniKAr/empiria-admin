import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getEventById,
  updateEventStatus,
  toggleEventFeatured,
} from "@/lib/actions";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { EventStatus } from "@/lib/types";
import { ArrowLeft, Star, Ban, CheckCircle, Eye } from "lucide-react";
import { IssueTicketsModal } from "./IssueTicketsModal";
import { AdminTicketTable } from "./AdminTicketTable";

export default async function EventDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let data;
  try {
    data = await getEventById(id);
  } catch {
    notFound();
  }

  const { event, tiers, orders } = data;
  const organizer = event.organizer as any;
  const organizerAppUrl = process.env.NEXT_PUBLIC_ORGANIZER_APP_URL;

  // Fetch tickets for this event with tier names
  const supabase = getSupabaseAdmin();
  const { data: ticketsRaw } = await supabase
    .from("tickets")
    .select("id, attendee_name, attendee_email, status, tier_id, order_id, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  const tierMap = new Map((tiers as any[]).map((t: any) => [t.id, t.name]));
  const tickets = (ticketsRaw || []).map((t: any) => ({
    id: t.id as string,
    attendee_name: t.attendee_name as string | null,
    attendee_email: t.attendee_email as string | null,
    status: t.status as string,
    tier_name: (tierMap.get(t.tier_id) || "Unknown") as string,
    order_id: t.order_id as string,
    created_at: t.created_at as string,
  }));

  const tierOptions = (tiers as any[]).map((t: any) => ({
    id: t.id as string,
    name: t.name as string,
    price: Number(t.price),
    currency: (t.currency as string) || event.currency,
    remaining: t.remaining_quantity as number,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
            <StatusBadge status={event.status} />
            {event.is_featured && <Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {event.venue_name ?? "Online"} · {event.city ?? ""} · {formatDate(event.start_at)} – {formatDate(event.end_at)}
          </p>
        </div>
        {organizer && (
          <a
            href={`${organizerAppUrl}?as=${organizer.auth0_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            View as Organizer
          </a>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <form action={async () => { "use server"; await toggleEventFeatured(id, !event.is_featured); }}>
          <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            <Star className="w-4 h-4" />
            {event.is_featured ? "Unfeature" : "Feature"}
          </button>
        </form>
        {event.status === "draft" && (
          <form action={async () => { "use server"; await updateEventStatus(id, "published" as EventStatus); }}>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
              <CheckCircle className="w-4 h-4" />
              Publish
            </button>
          </form>
        )}
        {(event.status === "draft" || event.status === "published") && (
          <form action={async () => { "use server"; await updateEventStatus(id, "cancelled" as EventStatus); }}>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
              <Ban className="w-4 h-4" />
              Cancel Event
            </button>
          </form>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Event Details</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-500">Slug</dt><dd className="font-mono text-slate-900">{event.slug}</dd></div>
            <div><dt className="text-slate-500">Location Type</dt><dd className="capitalize text-slate-900">{event.location_type}</dd></div>
            <div><dt className="text-slate-500">Seating</dt><dd className="capitalize text-slate-900">{event.seating_type.replace(/_/g, " ")}</dd></div>
            <div><dt className="text-slate-500">Currency</dt><dd className="uppercase text-slate-900">{event.currency}</dd></div>
            <div>
              <dt className="text-slate-500">Capacity</dt>
              <dd className="text-slate-900">{event.total_tickets_sold} / {event.total_capacity === 0 ? "Unlimited" : event.total_capacity}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Platform Fee</dt>
              <dd className="text-slate-900">
                {Number(event.platform_fee_percent)}%
                {Number(event.platform_fee_fixed) > 0 && ` + ${formatCurrency(Number(event.platform_fee_fixed), event.currency)}`}
              </dd>
            </div>
            <div><dt className="text-slate-500">Created</dt><dd className="text-slate-900">{formatDateTime(event.created_at)}</dd></div>
            <div><dt className="text-slate-500">Source App</dt><dd className="text-slate-900">{event.source_app ?? "—"}</dd></div>
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Organizer</h2>
          {organizer ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-900">{organizer.full_name as string}</p>
              <p className="text-slate-500">{organizer.email as string}</p>
              <p className="text-slate-500">Stripe: {(organizer.stripe_account_id as string) ?? "Not connected"}</p>
              <Link href={`/dashboard/users/${organizer.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                View profile →
              </Link>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Unknown organizer</p>
          )}
        </div>
      </div>

      {/* Ticket Tiers */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Ticket Tiers</h2>
          {tierOptions.length > 0 && <IssueTicketsModal eventId={id} tiers={tierOptions} />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Tier</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Price</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Sold / Total</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Max/Order</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Hidden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tiers.map((tier: any) => (
                <tr key={tier.id as string}>
                  <td className="px-6 py-3 font-medium text-slate-900">{tier.name as string}</td>
                  <td className="px-6 py-3 text-slate-900">{formatCurrency(Number(tier.price), tier.currency as string)}</td>
                  <td className="px-6 py-3 text-slate-600">
                    {(tier.initial_quantity as number) - (tier.remaining_quantity as number)} / {tier.initial_quantity as number}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{tier.max_per_order as number}</td>
                  <td className="px-6 py-3"><StatusBadge status={tier.is_hidden ? "true" : "false"} /></td>
                </tr>
              ))}
              {tiers.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No ticket tiers defined.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tickets */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Tickets ({tickets.length})</h2>
        </div>
        <AdminTicketTable tickets={tickets} />
      </div>

      {/* Recent Orders for this event */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Orders ({orders.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Order ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Platform Fee</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o: any) => (
                <tr key={o.id as string} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link href={`/dashboard/orders/${o.id}`} className="font-mono text-xs text-indigo-600 hover:text-indigo-700">
                      {(o.id as string).slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-900">{formatCurrency(Number(o.total_amount), o.currency as string)}</td>
                  <td className="px-6 py-3 text-emerald-600 font-medium">{formatCurrency(Number(o.platform_fee_amount), o.currency as string)}</td>
                  <td className="px-6 py-3"><StatusBadge status={o.status as string} /></td>
                  <td className="px-6 py-3 text-slate-500">{formatDateTime(o.created_at as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
