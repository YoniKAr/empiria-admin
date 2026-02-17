import { getCategories, createCategory, toggleCategoryActive } from "@/lib/actions";
import { formatDate, slugify } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { Plus } from "lucide-react";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        <p className="text-slate-500 text-sm mt-1">{categories.length} categories</p>
      </div>

      {/* Create form */}
      <form
        action={async (formData: FormData) => {
          "use server";
          const name = formData.get("name") as string;
          if (!name?.trim()) return;
          await createCategory(name.trim(), slugify(name.trim()));
        }}
        className="flex gap-3"
      >
        <input
          name="name"
          type="text"
          placeholder="New category name…"
          required
          className="flex-1 max-w-sm px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Slug</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Active</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat: Record<string, unknown>) => (
                <tr key={cat.id as string} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{cat.name as string}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{cat.slug as string}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={cat.is_active ? "Active" : "Inactive"} />
                  </td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(cat.created_at as string)}</td>
                  <td className="px-6 py-4">
                    <form action={async () => { "use server"; await toggleCategoryActive(cat.id as string, !(cat.is_active as boolean)); }}>
                      <button type="submit" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                        {cat.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No categories yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
