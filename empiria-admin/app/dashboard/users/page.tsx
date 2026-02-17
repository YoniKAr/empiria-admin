import Link from "next/link";
import { getUsers } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import SearchFilter from "@/components/SearchFilter";
import Pagination from "@/components/Pagination";
import type { UserRole } from "@/lib/types";
import { Eye } from "lucide-react";

const ROLE_OPTIONS = [
  { label: "Attendee", value: "attendee" },
  { label: "Organizer", value: "organizer" },
  { label: "Non-Profit", value: "non_profit" },
  { label: "Admin", value: "admin" },
];

export default async function UsersPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const role = searchParams.status as UserRole | undefined;
  const search = searchParams.search;

  const { users, total } = await getUsers({ role, search, page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 text-sm mt-1">{total} user{total !== 1 ? "s" : ""} total</p>
      </div>

      <SearchFilter placeholder="Search by name or email…" filterKey="status" filterOptions={ROLE_OPTIONS} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Stripe</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user: any) => (
                <tr key={user.id as string} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/users/${user.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {(user.full_name as string) || "Unnamed"}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.email as string}</td>
                  <td className="px-6 py-4"><StatusBadge status={user.role as string} /></td>
                  <td className="px-6 py-4 text-slate-600">
                    {user.stripe_account_id ? (
                      <span className="text-emerald-600 text-xs font-medium">Connected</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(user.created_at as string)}</td>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/users/${user.id}`} className="text-indigo-600 hover:text-indigo-700">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination total={total} limit={25} page={page} />
    </div>
  );
}
