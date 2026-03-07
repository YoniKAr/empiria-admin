"use client";

import { SeatmapViewer } from "@/components/seatmap/SeatmapViewer";
import type { SeatingConfig } from "@/lib/seatmap-types";

interface SeatmapSectionProps {
  event: {
    seating_type: string;
    seating_config: Record<string, unknown>;
    total_tickets_sold: number;
    total_capacity: number;
  };
  tiers: Array<{
    initial_quantity: number;
    remaining_quantity: number;
  }>;
}

export function SeatmapSection({ event, tiers }: SeatmapSectionProps) {
  const config = event.seating_config as unknown as SeatingConfig;

  // Don't render if no seating config data
  if (!config || (!config.zones && !config.sections)) {
    return null;
  }

  // Calculate seat utilization
  const totalSeats = tiers.reduce(
    (sum, t) => sum + Number(t.initial_quantity),
    0
  );
  const soldSeats = tiers.reduce(
    (sum, t) => sum + (Number(t.initial_quantity) - Number(t.remaining_quantity)),
    0
  );
  const utilization = totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0;

  const seatingLabel =
    event.seating_type === "reserved_seating_list"
      ? "Zone Map"
      : event.seating_type === "seatmap_pro"
        ? "Seat Map"
        : event.seating_type;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Seating Map</h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          {seatingLabel}
        </span>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-slate-500">Seats Sold:</span>{" "}
          <span className="font-medium text-slate-900">
            {soldSeats} / {totalSeats}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Utilization:</span>{" "}
          <span className="font-medium text-slate-900">{utilization}%</span>
        </div>
        <div className="flex items-center gap-3 ml-auto text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            Sold
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            Held
          </span>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-slate-50">
        <SeatmapViewer seatingConfig={config} />
      </div>
    </div>
  );
}
