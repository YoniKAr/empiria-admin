import { getCategories } from "@/lib/actions";
import { SpecialPageForm } from "./SpecialPageForm";

export const dynamic = "force-dynamic";

export default async function CreateSpecialPage() {
  const categories = await getCategories();
  const activeCategories = categories.filter((c: any) => c.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Create Special Page
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Create a promotional landing page for a category.
        </p>
      </div>
      <SpecialPageForm categories={activeCategories} />
    </div>
  );
}
