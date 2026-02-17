import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  published: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  refunded: "bg-purple-100 text-purple-700",
  valid: "bg-emerald-100 text-emerald-700",
  used: "bg-blue-100 text-blue-700",
  expired: "bg-slate-100 text-slate-700",
  attendee: "bg-sky-100 text-sky-700",
  organizer: "bg-violet-100 text-violet-700",
  non_profit: "bg-teal-100 text-teal-700",
  admin: "bg-amber-100 text-amber-700",
  true: "bg-emerald-100 text-emerald-700",
  false: "bg-slate-100 text-slate-700",
};

export default function StatusBadge({ status }: { status: string }) {
  const colorClass =
    COLORS[status.toLowerCase()] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
        colorClass
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
