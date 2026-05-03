"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PERIODS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

export default function PeriodSelector({ current }: { current: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(days: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", String(days));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {PERIODS.map(({ label, days }) => (
        <button
          key={days}
          onClick={() => select(days)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            current === days
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
