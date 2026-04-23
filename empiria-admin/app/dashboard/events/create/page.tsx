import { requireAdmin } from "@/lib/admin-guard";
import { getCategories } from "@/lib/actions";
import AdminCreateEventForm from "./AdminCreateEventForm";

export default async function AdminCreateEventPage() {
    const admin = await requireAdmin();
    const categories = await getCategories();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Create Event</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Create a new event as Empiria Events (platform-owned).
                </p>
            </div>
            <AdminCreateEventForm categories={categories} adminAuthId={admin.auth0_id} />
        </div>
    );
}
