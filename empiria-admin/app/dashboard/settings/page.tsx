import { requireAdmin } from "@/lib/admin-guard";
import ProfileForm from "./ProfileForm";
import CurrencyForm from "./CurrencyForm";
import SettingsTabs from "./SettingsTabs";

export const dynamic = "force-dynamic";

const SUPPORTED = ["CAD", "USD", "EUR", "GBP", "AUD", "INR", "JPY", "SGD", "MXN", "BRL"];

async function fetchRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 86400 },
    });
    const json = await res.json();
    const all: Record<string, number> = json.rates ?? {};
    return Object.fromEntries(SUPPORTED.map((c) => [c, all[c] ?? 1]));
  } catch {
    return Object.fromEntries(SUPPORTED.map((c) => [c, 1]));
  }
}

export default async function SettingsPage() {
  const [admin, rates] = await Promise.all([requireAdmin(), fetchRates()]);

  const parts = (admin.full_name || "").split(" ");
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  const defaultCurrency = (admin.default_currency || "CAD").toUpperCase();

  const profileContent = (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[28px] font-bold text-[#1a1209]">Profile Information</h1>
        <div className="px-4 py-1.5 rounded-full border border-emerald-500 text-emerald-600 font-medium text-[13px] bg-emerald-50/50">
          Active
        </div>
      </div>
      <p className="text-slate-500 text-[15px] mb-12">Update your photo and personal details.</p>
      <ProfileForm
        firstName={firstName}
        lastName={lastName}
        email={admin.email}
        avatarUrl={admin.avatar_url || ""}
      />
    </>
  );

  const currencyContent = (
    <CurrencyForm
      defaultCurrency={defaultCurrency}
      rates={rates}
      supportedCurrencies={SUPPORTED}
    />
  );

  return (
    <SettingsTabs profileContent={profileContent} currencyContent={currencyContent} />
  );
}
