"use client";

import { useState } from "react";

const TABS = [
  { id: "profile", label: "Profile Details" },
  { id: "currency", label: "Currency" },
];

export default function SettingsTabs({
  profileContent,
  currencyContent,
}: {
  profileContent: React.ReactNode;
  currencyContent: React.ReactNode;
}) {
  const [active, setActive] = useState("profile");

  return (
    <div className="max-w-4xl w-full">
      {/* Tab bar */}
      <div className="flex items-center gap-8 border-b border-slate-200 mb-8 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
              active === tab.id
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "profile" && profileContent}
      {active === "currency" && currencyContent}
    </div>
  );
}
