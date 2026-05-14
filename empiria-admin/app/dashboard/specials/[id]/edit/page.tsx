import { getCategoryPage, getCategories } from "@/lib/actions";
import { SpecialPageForm } from "../../create/SpecialPageForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditSpecialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let page;
  try {
    page = await getCategoryPage(id);
  } catch {
    notFound();
  }

  const categories = await getCategories();
  const activeCategories = categories.filter((c: any) => c.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Edit Special Page
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Update this promotional landing page.
        </p>
      </div>
      <SpecialPageForm categories={activeCategories} existingPage={page} />
    </div>
  );
}
