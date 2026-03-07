"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, Polygon, Circle, FabricImage, FabricText } from "fabric";
import type {
  SeatingConfig,
  ZoneDefinition,
  SectionDefinition,
} from "@/lib/seatmap-types";
import { migrateSeatingConfig } from "@/lib/migrate-seating-config";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SeatmapViewerProps {
  seatingConfig: SeatingConfig;
  soldSeatIds?: string[];
  heldSeatIds?: string[];
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

const STATUS_COLORS = {
  available: "#22c55e",
  sold: "#9ca3af",
  held: "#eab308",
};

export function SeatmapViewer({
  seatingConfig,
  soldSeatIds = [],
  heldSeatIds = [],
}: SeatmapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: "#f1f5f9",
      selection: false,
    });

    fabricRef.current = canvas;

    async function render() {
      const config = migrateSeatingConfig(seatingConfig);

      if (config.image_url) {
        try {
          const img = await FabricImage.fromURL(config.image_url);
          const scale = Math.min(
            CANVAS_WIDTH / img.width!,
            CANVAS_HEIGHT / img.height!
          );
          img.scaleX = scale;
          img.scaleY = scale;
          img.set({
            left: (CANVAS_WIDTH - img.width! * scale) / 2,
            top: (CANVAS_HEIGHT - img.height! * scale) / 2,
            selectable: false,
            evented: false,
          });
          canvas.backgroundImage = img;
          canvas.renderAll();
        } catch {
          // Image load failed, continue without background
        }
      }

      if (config.zones) {
        for (const zone of config.zones) {
          renderZone(canvas, zone);
        }
      }

      if (config.sections) {
        for (const section of config.sections) {
          renderSection(canvas, section, soldSeatIds, heldSeatIds);
        }
      }

      canvas.renderAll();
    }

    render();

    // Tooltip on hover
    canvas.on("mouse:over", (e) => {
      const obj = e.target as any;
      if (!obj?._customData) return;

      const { seatLabel, seatStatus, zoneName } = obj._customData;
      let text = "";
      if (seatLabel) {
        text = `${seatLabel} - ${seatStatus || "available"}`;
      } else if (zoneName) {
        text = zoneName;
      }

      if (text) {
        const pointer = canvas.getScenePoint(e.e);
        setTooltip({ text, x: pointer.x, y: pointer.y - 20 });
      }
    });

    canvas.on("mouse:out", () => {
      setTooltip(null);
    });

    canvas.on("mouse:move", (e) => {
      const obj = e.target as any;
      if (!obj?._customData?.seatLabel && !obj?._customData?.zoneName) {
        setTooltip(null);
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [seatingConfig, soldSeatIds, heldSeatIds]);

  return (
    <div className="relative inline-block">
      <canvas ref={canvasRef} />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function getPolygonCenter(points: [number, number][]): { x: number; y: number } {
  const sum = points.reduce(
    (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function renderZone(canvas: Canvas, zone: ZoneDefinition) {
  for (const polygon of zone.polygons) {
    if (polygon.points.length < 3) continue;

    const poly = new Polygon(
      polygon.points.map(([x, y]) => ({ x, y })),
      {
        fill: zone.color + "30",
        stroke: zone.color,
        strokeWidth: 2,
        selectable: false,
        evented: true,
      }
    );
    (poly as any)._customData = { zoneName: zone.name };
    canvas.add(poly);
  }

  // Add zone label at center of first polygon
  if (zone.polygons.length > 0 && zone.polygons[0].points.length >= 3) {
    const firstPoly = zone.polygons[0];
    const center = getPolygonCenter(firstPoly.points);
    const label = new FabricText(zone.name, {
      left: center.x,
      top: center.y,
      fontSize: 12,
      fill: zone.color,
      fontWeight: "bold",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });
    canvas.add(label);
  }
}

function renderSection(
  canvas: Canvas,
  section: SectionDefinition,
  soldSeatIds: string[],
  heldSeatIds: string[]
) {
  if (section.points.length >= 3) {
    const polygon = new Polygon(
      section.points.map(([x, y]) => ({ x, y })),
      {
        fill: section.color + "15",
        stroke: section.color,
        strokeWidth: 1,
        strokeDashArray: [4, 4],
        selectable: false,
        evented: false,
      }
    );
    canvas.add(polygon);

    const bounds = polygon.getBoundingRect();
    const label = new FabricText(section.name, {
      left: bounds.left + bounds.width / 2,
      top: bounds.top + 12,
      fontSize: 11,
      fill: section.color,
      fontWeight: "bold",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });
    canvas.add(label);
  }

  for (const seat of section.seats) {
    const isSold = soldSeatIds.includes(seat.id);
    const isHeld = heldSeatIds.includes(seat.id);
    const status = isSold ? "sold" : isHeld ? "held" : "available";
    const color = STATUS_COLORS[status];

    const circle = new Circle({
      left: seat.x - 6,
      top: seat.y - 6,
      radius: 6,
      fill: color,
      stroke: "#fff",
      strokeWidth: 1,
      selectable: false,
      evented: true,
    });
    (circle as any)._customData = { seatLabel: seat.label, seatStatus: status };
    canvas.add(circle);

    const seatLabel = new FabricText(seat.label, {
      left: seat.x,
      top: seat.y,
      fontSize: 7,
      fontFamily: "system-ui, sans-serif",
      fill: "#ffffff",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });
    canvas.add(seatLabel);
  }
}
