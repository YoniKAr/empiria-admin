import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserById, updateUserRole, softDeleteUser } from "@/lib/actions";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import type { UserRole } from "@/lib/types";
import { ArrowLeft, Eye, Trash2, Shield } from "lucide-react";

const ROLES: UserRole[] = ["attendee", "organizer", "non_profit", "admin"];

export default async function UserDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let data;
  try {
    data = await getUserById(id);
  } catch {
    notFound();
  }

  const { user, events, orders } = data;
  const organizerAppUrl = process.env.NEXT_PUBLIC_ORGANIZER_APP_URL;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/users" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{user.full_name || "Unnamed User"}</h1>
            <StatusBadge status={user.role} />
          </div>
          <p className="text-slate-500 text-sm mt-1">{user.email}</p>
        </div>
        {user.role === "organizer" && (
          <a
            href={`${organizerAppUrl}?as=${user.auth0_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <Eye className="w-4 h-4" /> View as Organizer
          </a>
        )}
      </div>

      {/* Role change & delete */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => (
          <form key={role} action={async () => { "use server"; await updateUserRole(id, role); }}>
            <button
              type="submit"
              disabled={user.role === role}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                user.role === role
                  ? "bg-indigo-600 text-white cursor-default"
                  : "border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              {role.replace(/_/g, " ")}
            </button>
          </form>
        ))}
        <form action={async () => { "use server"; await softDeleteUser(id); }}>
          <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
            <Trash2 className="w-4 h-4" /> Soft Delete
          </button>
        </form>
      </div>

      {/* Profile details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Profile</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-500">Auth0 ID</dt><dd className="font-mono text-xs text-slate-900 break-all">{user.auth0_id}</dd></div>
            <div><dt className="text-slate-500">Phone</dt><dd className="text-slate-900">{user.phone ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Currency</dt><dd className="uppercase text-slate-900">{user.default_currency}</dd></div>
            <div><dt className="text-slate-500">Stripe Account</dt><dd className="font-mono text-xs text-slate-900">{user.stripe_account_id ?? "Not connected"}</dd></div>
            <div><dt className="text-slate-500">Joined</dt><dd className="text-slate-900">{formatDateTime(user.created_at)}</dd></div>
            <div><dt className="text-slate-500">Last Sign In</dt><dd className="text-slate-900">{user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "Never"}</dd></div>
          </dl>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <h2 className="font-semibold text-slate-900">Interests</h2>
          {user.interests?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest: string) => (
                <span key={interest} className="px-2.5 py-1 bg-slate-100 rounded-full text-xs text-slate-700">{interest}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No interests set.</p>
          )}
        </div>
      </div>

      {/* Events (if organizer) */}
      {events.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Events ({events.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Title</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((e: any) => (
                  <tr key={e.id as string} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <Link href={`/dashboard/events/${e.id}`} className="text-indigo-600 hover:text-indigo-700 font-medium">{e.title as string}</Link>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{e.first_occurrence ? formatDate(e.first_occurrence.starts_at as string) : '—'}</td>
                    <td className="px-6 py-3"><StatusBadge status={e.status as string} /></td>
                    <td className="px-6 py-3 text-slate-600">{e.total_tickets_sold as number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders */}
      {orders.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Orders ({orders.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Event</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o: any) => {
                  const event = o.event as any;
                  return (
                    <tr key={o.id as string} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <Link href={`/dashboard/orders/${o.id}`} className="font-mono text-xs text-indigo-600 hover:text-indigo-700">{(o.id as string).slice(0, 8)}…</Link>
                      </td>
                      <td className="px-6 py-3 text-slate-900">{event?.title ?? "—"}</td>
                      <td className="px-6 py-3 font-medium text-slate-900">{formatCurrency(Number(o.total_amount), o.currency as string)}</td>
                      <td className="px-6 py-3"><StatusBadge status={o.status as string} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
