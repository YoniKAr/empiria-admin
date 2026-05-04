"use client";

import { useState, useTransition } from "react";
import { updateAdminProfile } from "@/lib/actions";

const CURRENCY_LABELS: Record<string, string> = {
  CAD: "Canadian Dollar",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  AUD: "Australian Dollar",
  INR: "Indian Rupee",
  JPY: "Japanese Yen",
  SGD: "Singapore Dollar",
  MXN: "Mexican Peso",
  BRL: "Brazilian Real",
};

export default function CurrencyForm({
  defaultCurrency,
  rates,
  supportedCurrencies,
}: {
  defaultCurrency: string;
  rates: Record<string, number>;
  supportedCurrencies: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(defaultCurrency);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSuccess(false);
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("currency", selected);
        await updateAdminProfile(fd);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
      }
    });
  }

  const baseRate = rates[selected] ?? 1;
  const relativeRates = supportedCurrencies
    .filter((c) => c !== selected)
    .map((c) => ({
      code: c,
      label: CURRENCY_LABELS[c] ?? c,
      rate: (rates[c] ?? 1) / baseRate,
    }));

  return (
    <div className="space-y-10 pb-16">
      <div>
        <h1 className="text-[28px] font-bold text-[#1a1209]">Currency Settings</h1>
        <p className="text-slate-500 text-[15px] mt-1">
          Choose the currency used across the dashboard. Revenue and fees will be converted using daily exchange rates.
        </p>
      </div>

      {/* Selector */}
      <div className="flex flex-col gap-4">
        <label className="text-[12px] font-bold tracking-[0.08em] text-slate-400 uppercase">
          Default Currency
        </label>
        <div className="flex flex-wrap gap-2">
          {supportedCurrencies.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelected(c)}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-colors ${
                selected === c
                  ? "bg-[#f98f1d] text-white border-[#f98f1d]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#f98f1d] hover:text-[#f98f1d]"
              }`}
            >
              {c} — {CURRENCY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Exchange rate table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
            1 {selected} equals
          </span>
          <span className="text-[11px] text-slate-400">Rates update daily</span>
        </div>
        <div className="divide-y divide-slate-100">
          {relativeRates.map(({ code, label, rate }) => (
            <div key={code} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-slate-700 w-10">{code}</span>
                <span className="text-[13px] text-slate-400">{label}</span>
              </div>
              <span className="text-[13px] font-mono font-semibold text-slate-800">
                {rate.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end items-center gap-4 pt-2">
        {error && <span className="text-red-500 text-[14px] font-medium">{error}</span>}
        {success && <span className="text-emerald-500 text-[14px] font-medium">Currency updated!</span>}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="bg-[#f98f1d] hover:bg-[#ea8315] active:bg-[#db760d] text-white px-7 py-2.5 rounded-lg font-medium text-[15px] transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Currency"}
        </button>
      </div>
    </div>
  );
}
