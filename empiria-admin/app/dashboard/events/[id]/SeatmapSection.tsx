"use client";

import { SeatmapViewer } from "@/components/seatmap/SeatmapViewer";
import type { SeatingConfig, SeatRange } from "@/lib/seatmap-types";
import { migrateSeatingConfig } from "@/lib/migrate-seating-config";

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
  const config = migrateSeatingConfig(event.seating_config as any);

  // Don't render if no seating config data
  if (!config || (!config.zones && !config.sections && !config.seat_ranges)) {
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

  const hasRanges = config.seat_ranges && config.seat_ranges.length > 0;
  const seatingLabel =
    event.seating_type === "reserved_seating_list"
      ? hasRanges ? "Assigned Seating" : "Zone Map"
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

      {event.seating_type === "reserved_seating_list" && hasRanges ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>{config.allow_seat_choice ? "Customers can choose seats" : "Seats auto-assigned"}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 font-medium">Prefix</th>
                <th className="py-2 font-medium">Range</th>
                <th className="py-2 font-medium">Seats</th>
              </tr>
            </thead>
            <tbody>
              {config.seat_ranges!.map((range: SeatRange) => (
                <tr key={range.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-900">{range.prefix}</td>
                  <td className="py-2 text-slate-600">{range.prefix}{range.start} - {range.prefix}{range.end}</td>
                  <td className="py-2 text-slate-600">{range.end - range.start + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-sm text-slate-500">
            Total seats: {config.seat_ranges!.reduce((sum: number, r: SeatRange) => sum + (r.end - r.start + 1), 0)}
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-slate-50">
          <SeatmapViewer seatingConfig={config} />
        </div>
      )}
    </div>
  );
}
