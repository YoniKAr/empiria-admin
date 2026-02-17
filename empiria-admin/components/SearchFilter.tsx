"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useRef } from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface SearchFilterProps {
  placeholder?: string;
  filterKey?: string;
  filterOptions?: FilterOption[];
}

export default function SearchFilter({
  placeholder = "Search…",
  filterKey = "status",
  filterOptions,
}: SearchFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const currentSearch = searchParams.get("search") ?? "";
  const currentFilter = searchParams.get(filterKey) ?? "";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(formRef.current!);
            update("search", fd.get("search") as string);
          }}
        >
          <input
            name="search"
            type="text"
            defaultValue={currentSearch}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </form>
      </div>
      {filterOptions && (
        <select
          value={currentFilter}
          onChange={(e) => update(filterKey, e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">All</option>
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
