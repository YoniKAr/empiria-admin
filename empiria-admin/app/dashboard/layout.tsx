import { requireAdmin } from "@/lib/admin-guard";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen">
      <Sidebar adminName={admin.full_name ?? admin.email} />
      <div className="pl-60">
        <main className="p-6 lg:p-8 max-w-7xl">{children}</main>
      </div>
    </div>
  );
}
