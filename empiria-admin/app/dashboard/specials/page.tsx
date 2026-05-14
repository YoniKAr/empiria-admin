import {
  getCategoryPages,
  toggleCategoryPageActive,
  deleteCategoryPage,
} from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SpecialsPage() {
  const pages = await getCategoryPages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Special Pages</h1>
          <p className="text-slate-500 text-sm mt-1">
            {pages.length} special {pages.length === 1 ? "page" : "pages"}
          </p>
        </div>
        <Link
          href="/dashboard/specials/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Special Page
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.map((page: any) => (
                <tr
                  key={page.id as string}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {page.title as string}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {page.category?.name ?? "—"}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    /specials/{page.slug as string}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      status={page.is_active ? "Active" : "Inactive"}
                    />
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(page.created_at as string)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/specials/${page.id}/edit`}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Edit
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await toggleCategoryPageActive(
                            page.id as string,
                            !(page.is_active as boolean)
                          );
                        }}
                      >
                        <button
                          type="submit"
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          {page.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await deleteCategoryPage(page.id as string);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {pages.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No special pages yet. Create one to get started.
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
