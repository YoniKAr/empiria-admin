import { getTemplates, deleteTemplate } from "@/lib/template-actions";
import { formatDateTime } from "@/lib/utils";
import { Trash2, LayoutTemplate } from "lucide-react";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Venue Templates</h1>
        <p className="text-sm text-slate-500 mt-1">
          All saved venue seating map templates across organizers.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <LayoutTemplate className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No templates yet</p>
            <p className="text-xs mt-1">
              Templates created by organizers will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                    Owner ID
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                    Created
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                    Updated
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {template.name}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">
                      {template.owner_id.slice(0, 20)}...
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {formatDateTime(template.created_at)}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {formatDateTime(template.updated_at)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await deleteTemplate(template.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
