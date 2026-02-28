import Link from "next/link";
import { getEvents } from "@/lib/actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import SearchFilter from "@/components/SearchFilter";
import Pagination from "@/components/Pagination";
import type { EventStatus } from "@/lib/types";
import { Star, ExternalLink } from "lucide-react";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Completed", value: "completed" },
];

export default async function EventsPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const status = searchParams.status as EventStatus | undefined;
  const search = searchParams.search;

  const { events, total } = await getEvents({ status, search, page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Events</h1>
        <p className="text-slate-500 text-sm mt-1">
          {total} event{total !== 1 ? "s" : ""} total
        </p>
      </div>

      <SearchFilter
        placeholder="Search events by title…"
        filterKey="status"
        filterOptions={STATUS_OPTIONS}
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Event</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Organizer</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tickets</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fee %</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Featured</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event: any) => {
                const organizer = event.organizer;
                const capacity = event.total_capacity === 0 ? "∞" : String(event.total_capacity);
                return (
                  <tr key={event.id as string} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/events/${event.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                        {event.title as string}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">{(event.city as string) ?? "Online"} · {event.currency as string}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{organizer?.full_name ?? organizer?.email ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{event.first_occurrence ? formatDate(event.first_occurrence.starts_at as string) : '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{event.total_tickets_sold as number} / {capacity}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {Number(event.platform_fee_percent)}%
                      {Number(event.platform_fee_fixed) > 0 && ` + ${formatCurrency(Number(event.platform_fee_fixed), event.currency as string)}`}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={event.status as string} /></td>
                    <td className="px-6 py-4">
                      {Boolean(event.is_featured) && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/events/${event.id}`} className="text-indigo-600 hover:text-indigo-700">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">No events found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination total={total} limit={25} page={page} />
    </div>
  );
}
