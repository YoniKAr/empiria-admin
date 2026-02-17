import { getTickets, updateTicketStatus } from "@/lib/actions";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import SearchFilter from "@/components/SearchFilter";
import Pagination from "@/components/Pagination";
import type { TicketStatus } from "@/lib/types";
import { Ban } from "lucide-react";

const STATUS_OPTIONS = [
  { label: "Valid", value: "valid" },
  { label: "Used", value: "used" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Expired", value: "expired" },
];

export default async function TicketsPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const status = searchParams.status as TicketStatus | undefined;
  const search = searchParams.search;

  const { tickets, total } = await getTickets({ status, search, page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
        <p className="text-slate-500 text-sm mt-1">{total} ticket{total !== 1 ? "s" : ""} total</p>
      </div>

      <SearchFilter placeholder="Search by QR code, name, or email…" filterKey="status" filterOptions={STATUS_OPTIONS} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">QR Code</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Attendee</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Event</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tier</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Purchased</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((ticket: any) => {
                const event = ticket.event as any;
                const tier = ticket.tier as any;
                return (
                  <tr key={ticket.id as string} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{(ticket.qr_code_secret as string).slice(0, 12)}…</td>
                    <td className="px-6 py-3">
                      <p className="text-slate-900">{(ticket.attendee_name as string) ?? "—"}</p>
                      <p className="text-xs text-slate-400">{(ticket.attendee_email as string) ?? ""}</p>
                    </td>
                    <td className="px-6 py-3 text-slate-600 max-w-[160px] truncate">{event?.title ?? "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{tier?.name ?? "—"}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {tier?.price != null ? formatCurrency(Number(tier.price), tier.currency ?? "cad") : "—"}
                    </td>
                    <td className="px-6 py-3"><StatusBadge status={ticket.status as string} /></td>
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(ticket.purchase_date as string)}</td>
                    <td className="px-6 py-3">
                      {ticket.status === "valid" && (
                        <form action={async () => { "use server"; await updateTicketStatus(ticket.id as string, "cancelled" as TicketStatus); }}>
                          <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                            <Ban className="w-3 h-3" /> Cancel
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {tickets.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">No tickets found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination total={total} limit={25} page={page} />
    </div>
  );
}
