import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-guard";
import TopNav from "@/components/TopNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 75% 65% at 98% 50%, #FF7A1A 0%, #FFB06A 18%, #FFD9AA 36%, #FFEEDD 54%, #FFF6EE 70%, #FFFFFF 100%)",
        fontFamily: "'Geist', 'Geist Fallback', ui-sans-serif, sans-serif",
        color: "#1a1209",
      }}
    >
      <Suspense fallback={<nav style={{ height: 58 }} />}>
        <TopNav adminName={admin.full_name ?? admin.email} />
      </Suspense>
      <main style={{ maxWidth: 1380, margin: "0 auto", padding: "2rem 2rem 3rem" }}>
        {children}
      </main>
    </div>
  );
}
