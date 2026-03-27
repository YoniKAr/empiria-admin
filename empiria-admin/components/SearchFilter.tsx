"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useRef, useState, useEffect, useTransition } from "react";
import { globalSearch } from "@/lib/actions";
import Link from "next/link";

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSearch = searchParams.get("search") ?? "";
  const currentFilter = searchParams.get(filterKey) ?? "";

  const [query, setQuery] = useState(currentSearch);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<{ events: any[]; users: any[]; orders: any[] }>({ events: [], users: [], orders: [] });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length > 1) {
      setIsOpen(true);
      startTransition(() => {
        globalSearch(query).then((data) => {
          setResults(data);
        });
      });
    } else {
      setIsOpen(false);
      setResults({ events: [], users: [], orders: [] });
    }
  }, [query]);

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

  const hasResults = results.events.length > 0 || results.users.length > 0 || results.orders.length > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1" ref={dropdownRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            update("search", query);
            setIsOpen(false);
          }}
        >
          <input
            name="search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            autoComplete="off"
          />
        </form>

        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 8,
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
              border: "1px solid rgba(0,0,0,0.08)",
              overflow: "hidden",
              zIndex: 100,
              padding: "12px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: "60vh",
              overflowY: "auto",
            }}
          >
            {isPending && (
              <div style={{ padding: "12px 16px", color: "#666", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Searching...
              </div>
            )}

            {!isPending && !hasResults && (
              <div style={{ padding: "12px 16px", color: "#666", fontSize: 13 }}>No results found for &ldquo;{query}&rdquo;</div>
            )}

            {!isPending && results.events.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", padding: "4px 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>Events</div>
                {results.events.map((e: any) => (
                  <Link
                    key={e.id}
                    href={`/dashboard/events/${e.id}`}
                    onClick={() => setIsOpen(false)}
                    style={{ display: "block", padding: "10px 12px", borderRadius: 8, textDecoration: "none", color: "#1a1209", fontSize: 13, transition: "background 0.1s ease", cursor: "pointer" }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ fontWeight: 500 }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{e.status}</div>
                  </Link>
                ))}
              </div>
            )}

            {!isPending && results.users.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", padding: "4px 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>Users</div>
                {results.users.map((u: any) => (
                  <Link
                    key={u.id}
                    href={`/dashboard/users/${u.id}`}
                    onClick={() => setIsOpen(false)}
                    style={{ display: "block", padding: "10px 12px", borderRadius: 8, textDecoration: "none", color: "#1a1209", fontSize: 13, transition: "background 0.1s ease", cursor: "pointer" }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ fontWeight: 500 }}>{u.full_name || "No name"}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{u.email}</div>
                  </Link>
                ))}
              </div>
            )}

            {!isPending && results.orders.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", padding: "4px 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>Orders</div>
                {results.orders.map((o: any) => (
                  <Link
                    key={o.id}
                    href={`/dashboard/orders/${o.id}`}
                    onClick={() => setIsOpen(false)}
                    style={{ display: "block", padding: "10px 12px", borderRadius: 8, textDecoration: "none", color: "#1a1209", fontSize: 13, transition: "background 0.1s ease", cursor: "pointer" }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.stripe_payment_intent_id || o.id}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{o.status}</div>
                  </Link>
                ))}
              </div>
            )}
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}
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
