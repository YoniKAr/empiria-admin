"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  total: number;
  limit: number;
  page: number;
}

export default function Pagination({ total, limit, page }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  function buildHref(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
      <p className="text-sm text-slate-500">
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
        {total}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link
            href={buildHref(page - 1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        )}
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = i + 1;
          return (
            <Link
              key={p}
              href={buildHref(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium",
                p === page
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {p}
            </Link>
          );
        })}
        {totalPages > 5 && <span className="text-slate-400 px-1">…</span>}
        {page < totalPages && (
          <Link
            href={buildHref(page + 1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
