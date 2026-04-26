"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Separator } from "@/components/separator";
import type { ZoneDefinition, ZoneTier } from "@/lib/seatmap-types";
import { ZONE_COLORS } from "./ZonePropertiesPanel";

interface ZoneListEditorProps {
  zones: ZoneDefinition[];
  onChange: (zones: ZoneDefinition[]) => void;
  currency?: string;
}

function getNextColor(usedColors: string[]): string {
  const available = ZONE_COLORS.filter((c) => !usedColors.includes(c));
  if (available.length > 0) return available[0];
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
}

function makeDefaultTier(currency: string): ZoneTier {
  return {
    id: crypto.randomUUID(),
    name: "General",
    price: 0,
    initial_quantity: 100,
    max_per_order: 10,
    description: "",
    currency,
  };
}

function makeDefaultZone(
  index: number,
  usedColors: string[],
  currency: string
): ZoneDefinition {
  return {
    id: crypto.randomUUID(),
    tier_id: "",
    name: `Zone ${index + 1}`,
    color: getNextColor(usedColors),
    polygons: [],
    tiers: [makeDefaultTier(currency)],
  };
}

export function ZoneListEditor({
  zones,
  onChange,
  currency = "cad",
}: ZoneListEditorProps) {
  const [expandedZoneId, setExpandedZoneId] = useState<string | null>(
    zones[0]?.id ?? null
  );

  function addZone() {
    const usedColors = zones.map((z) => z.color);
    const newZone = makeDefaultZone(zones.length, usedColors, currency);
    const updated = [...zones, newZone];
    onChange(updated);
    setExpandedZoneId(newZone.id);
  }

  function removeZone(id: string) {
    const updated = zones.filter((z) => z.id !== id);
    onChange(updated);
    if (expandedZoneId === id) {
      setExpandedZoneId(updated[0]?.id ?? null);
    }
  }

  function updateZone(
    id: string,
    updates: Partial<Pick<ZoneDefinition, "name" | "color">>
  ) {
    const updated = zones.map((z) =>
      z.id === id ? { ...z, ...updates } : z
    );
    onChange(updated);
  }

  function addTier(zoneId: string) {
    const updated = zones.map((z) => {
      if (z.id !== zoneId) return z;
      const newTier = makeDefaultTier(
        z.tiers?.[0]?.currency || currency
      );
      return { ...z, tiers: [...(z.tiers || []), newTier] };
    });
    onChange(updated);
  }

  function removeTier(zoneId: string, tierId: string) {
    const updated = zones.map((z) => {
      if (z.id !== zoneId) return z;
      if (!z.tiers || z.tiers.length <= 1) return z;
      return { ...z, tiers: z.tiers.filter((t) => t.id !== tierId) };
    });
    onChange(updated);
  }

  function updateTier(
    zoneId: string,
    tierId: string,
    updates: Partial<ZoneTier>
  ) {
    const updated = zones.map((z) => {
      if (z.id !== zoneId) return z;
      return {
        ...z,
        tiers: (z.tiers || []).map((t) =>
          t.id === tierId ? { ...t, ...updates } : t
        ),
      };
    });
    onChange(updated);
  }

  const totalCapacity = zones.reduce(
    (sum, z) =>
      sum +
      (z.tiers || []).reduce((s, t) => s + (t.initial_quantity || 0), 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-sm text-foreground">
          Define Zones
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Create zones with pricing tiers. Each zone can have multiple ticket
          types (e.g. Adult, Child, VIP). No map image is needed.
        </p>
      </div>

      {/* Zone cards */}
      <div className="space-y-3">
        {zones.map((zone) => {
          const isExpanded = expandedZoneId === zone.id;
          const zoneTiers = zone.tiers || [];
          const zoneCapacity = zoneTiers.reduce(
            (s, t) => s + (t.initial_quantity || 0),
            0
          );

          return (
            <div
              key={zone.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Zone header bar with color accent */}
              <div
                className="h-1 w-full"
                style={{ backgroundColor: zone.color }}
              />
              <div className="p-4">
                {/* Zone header: name + color + remove */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex-1 flex items-center gap-3 text-left"
                    onClick={() =>
                      setExpandedZoneId(isExpanded ? null : zone.id)
                    }
                  >
                    <span
                      className="size-4 rounded-full shrink-0 border border-border"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="text-sm font-semibold text-foreground truncate">
                      {zone.name || "Unnamed Zone"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">
                      {zoneTiers.length} tier{zoneTiers.length !== 1 ? "s" : ""}{" "}
                      · {zoneCapacity} qty
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeZone(zone.id)}
                    className="h-8 w-8 p-0 text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 space-y-4">
                    {/* Zone name + color picker */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">
                          Zone Name
                        </Label>
                        <Input
                          value={zone.name}
                          onChange={(e) =>
                            updateZone(zone.id, { name: e.target.value })
                          }
                          placeholder="e.g. VIP Section"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Color</Label>
                        <div className="flex gap-1.5 flex-wrap">
                          {ZONE_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`size-6 rounded-full border-2 transition-all ${
                                zone.color === color
                                  ? "border-foreground scale-110"
                                  : "border-transparent hover:border-muted-foreground/40"
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() =>
                                updateZone(zone.id, { color })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Tiers list */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-xs font-medium">
                          Pricing Tiers
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTier(zone.id)}
                          className="h-7 text-xs gap-1"
                        >
                          <Plus className="size-3" />
                          Add Tier
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {zoneTiers.map((tier, tIdx) => (
                          <div
                            key={tier.id}
                            className="rounded-lg border border-border/60 p-3 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                                Tier {tIdx + 1}
                              </span>
                              {zoneTiers.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeTier(zone.id, tier.id)
                                  }
                                  className="h-6 w-6 p-0 text-destructive"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Name
                                </Label>
                                <Input
                                  value={tier.name}
                                  onChange={(e) =>
                                    updateTier(zone.id, tier.id, {
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. Adult"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Price ({currency.toUpperCase()})
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={tier.price}
                                  onChange={(e) =>
                                    updateTier(zone.id, tier.id, {
                                      price:
                                        e.target.value === ""
                                          ? 0
                                          : parseFloat(e.target.value),
                                    })
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Quantity
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={tier.initial_quantity}
                                  onChange={(e) =>
                                    updateTier(zone.id, tier.id, {
                                      initial_quantity:
                                        parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Max Per Order
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={tier.max_per_order}
                                  onChange={(e) =>
                                    updateTier(zone.id, tier.id, {
                                      max_per_order:
                                        parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add zone button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addZone}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Add Zone
      </Button>

      {/* Summary */}
      {zones.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total Zones</span>
            <span className="font-bold tabular-nums">{zones.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total Capacity</span>
            <span className="font-bold tabular-nums">{totalCapacity}</span>
          </div>
          <Separator className="my-2" />
          <div className="space-y-1">
            {zones.map((zone) => {
              const zt = zone.tiers || [];
              return (
                <div
                  key={zone.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="truncate">{zone.name || "Unnamed"}</span>
                  <span className="ml-auto tabular-nums shrink-0">
                    {zt.length} tier{zt.length !== 1 ? "s" : ""} ·{" "}
                    {zt.reduce((s, t) => s + (t.initial_quantity || 0), 0)} qty
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
