"use client";

import type { CSSProperties } from "react";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ───

interface DashboardData {
  totalRevenue: number;
  totalUsers: number;
  totalOrders: number;
  totalEvents: number;
  totalTicketsSold: number;
  platformFees: number;
  currency: string;
  recentOrders: {
    orders: any[];
    total: number;
  };
  recentEvents: any[];
}

// ─── Sub components ───

function Card({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.68)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderRadius: 22,
        padding: "1.15rem 1.3rem",
        border: "1px solid rgba(255,255,255,0.88)",
        boxShadow: "0 2px 20px rgba(200,110,30,0.07)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ label, extra }: { label: string; extra?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#444" }}>{label}</span>
      {extra ?? (
        <svg width="13" height="13" fill="none" stroke="#bbb" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M7 17 17 7M17 7H7M17 7v10" />
        </svg>
      )}
    </div>
  );
}

// ─── Helpers ───

function formatCurrencyLocal(amount: number, currency = "cad"): string {
  const symbols: Record<string, string> = {
    cad: "CA$", usd: "$", inr: "₹", gbp: "£", eur: "€",
  };
  const sym = symbols[currency.toLowerCase()] ?? currency.toUpperCase() + " ";
  return `${sym}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatDateLocal(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    year: "numeric", month: "short", day: "numeric",
  });
}

const DOT_COLORS = ["#F59E0B", "#3B82F6", "#8B5CF6", "#10B981", "#EC4899"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  published: { bg: "#ecfdf5", text: "#059669" },
  draft: { bg: "#f1f5f9", text: "#64748b" },
  completed: { bg: "#eff6ff", text: "#2563eb" },
  canceled: { bg: "#fef2f2", text: "#dc2626" },
  cancelled: { bg: "#fef2f2", text: "#dc2626" },
};

const QUICK_LINKS = [
  {
    label: "View Events",
    href: "/dashboard/events",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "View Users",
    href: "/dashboard/users",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "View Tickets",
    href: "/dashboard/tickets",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

// ─── Main component ───

export default function DashboardClient({ data }: { data: DashboardData }) {
  const ticketPercent = data.totalTicketsSold > 0
    ? Math.min(Math.round((data.totalTicketsSold / (data.totalTicketsSold + 100)) * 100), 100)
    : 0;

  return (
    <>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em", margin: 0, marginBottom: 10 }}>
            Welcome in, Admin
          </h1>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            {[
              { swatches: ["#E07010", "#F5BA55"], label: "Revenue" },
              { swatches: ["#1a1209", "#aaa"], label: "Orders" },
            ].map(({ swatches, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {swatches.map((c, i) => (
                  <span key={i} style={{ width: i === 0 ? 22 : 14, height: 10, borderRadius: 999, background: c, display: "inline-block" }} />
                ))}
                <span style={{ fontSize: 12, color: "#999", marginLeft: 2 }}>{label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a1209", display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "#999" }}>Output</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 36 }}>
          {[
            { v: data.totalUsers.toLocaleString(), l: "Users" },
            { v: data.totalOrders.toLocaleString(), l: "Orders" },
            { v: data.totalEvents.toLocaleString(), l: "Events" },
          ].map(({ v, l }) => (
            <div key={l} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOP CARD ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 1.1fr 1.3fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* Profile Card */}
        <Card>
          <div
            style={{
              width: 78, height: 78, borderRadius: 20,
              background: "linear-gradient(135deg, #FF944D 0%, #F5C842 100%)",
              margin: "0.25rem auto 0.75rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="42" height="42" fill="none" viewBox="0 0 24 24">
              <circle cx="9" cy="8" r="3.2" fill="rgba(255,255,255,0.92)" />
              <circle cx="15.5" cy="8" r="3.2" fill="rgba(255,255,255,0.45)" />
              <path d="M2 21c0-4.5 3-7.5 6.5-7.5h7C19 13.5 22 16.5 22 21"
                stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" fill="none" />
            </svg>
          </div>
          <p style={{ textAlign: "center", fontWeight: 700, fontSize: 16, margin: 0 }}>Platform Admin</p>
          <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", margin: "3px 0 18px" }}>Administrator</p>
          <div style={{ textAlign: "center" }}>
            <span
              style={{
                display: "inline-block",
                background: "#E07010",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 999,
                padding: "7px 24px",
              }}
            >
              {formatCurrencyLocal(data.platformFees, data.currency)}
            </span>
          </div>
        </Card>

        {/* Total Revenue */}
        <div
          style={{
            background: "linear-gradient(135deg, #E07010 0%, #F5C842 100%)",
            borderRadius: 22,
            padding: "1.15rem 1.3rem",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.9 }}>Total Revenue</span>
            <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M7 17 17 7M17 7H7M17 7v10" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              {formatCurrencyLocal(data.totalRevenue, data.currency)}
            </div>
            <p style={{ fontSize: 12, opacity: 0.75, margin: "8px 0 0" }}>
              From {data.totalOrders} completed orders
            </p>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: "1rem" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrencyLocal(data.platformFees, data.currency)}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Platform Fees</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.25)" }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{data.totalTicketsSold.toLocaleString()}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Tickets Sold</div>
            </div>
          </div>
        </div>

        {/* Tickets Sold */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#444" }}>Tickets Sold</span>
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.04em" }}>{ticketPercent}%</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {[
              { label: "Sold", pct: ticketPercent, color: "#E07010" },
              { label: "Fees", pct: data.totalOrders > 0 ? Math.round((data.platformFees / data.totalRevenue) * 100) || 0 : 0, color: "#F5C842" },
              { label: "Free", pct: 3, color: "#e8e8e8" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "#bbb", minWidth: 28, textAlign: "right" }}>{row.label}</span>
                <div style={{ flex: 1, height: 8, background: "#f2f2f2", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${row.pct}%`, height: "100%", background: row.color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
            <div style={{ height: 1, background: "#eee", margin: "2px 0" }} />
            {[
              { label: "Target", pct: 85, color: "#1a1209" },
              { label: "", pct: 26, color: "#ef4444" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "#bbb", minWidth: 28, textAlign: "right" }}>{row.label}</span>
                <div style={{ flex: 1, height: 8, background: "#f2f2f2", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${row.pct}%`, height: "100%", background: row.color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Orders — dark */}
        <div
          style={{
            background: "#1a1209",
            borderRadius: 22,
            padding: "1.25rem",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Recent Orders</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>
              {data.recentOrders.orders.length}
              <span style={{ fontSize: 13, color: "#555", fontWeight: 400 }}>/{data.recentOrders.total}</span>
            </span>
          </div>

          <div style={{ flex: 1 }}>
            {data.recentOrders.orders.map((order: any, i: number) => {
              const event = order.event as any;
              return (
                <div
                  key={order.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: i < data.recentOrders.orders.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: DOT_COLORS[i % DOT_COLORS.length], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {event?.title ?? "Unknown Event"}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#555" }}>
                      {formatDateLocal(order.created_at as string)}
                    </p>
                  </div>
                </div>
              );
            })}
            {data.recentOrders.orders.length === 0 && (
              <p style={{ margin: 0, fontSize: 13, color: "#555", textAlign: "center", padding: "2rem 0" }}>
                No orders yet
              </p>
            )}
          </div>

          <Link
            href="/dashboard/orders"
            style={{
              marginTop: "1rem",
              color: "#666", fontSize: 12,
              display: "flex", alignItems: "center", gap: 4,
              textDecoration: "none",
            }}
          >
            View all orders
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M7 17 17 7M17 7H7M17 7v10" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1rem" }}>
        {/* Recent Events */}
        <Card style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#444" }}>Recent Events</span>
            <Link
              href="/dashboard/events"
              style={{ fontSize: 12, color: "#E07010", textDecoration: "none", fontWeight: 600 }}
            >
              View all →
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.recentEvents.map((event: any) => {
              const organizer = event.organizer as any;
              const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
              return (
                <Link
                  key={event.id}
                  href={`/dashboard/events/${event.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "0.75rem 1rem",
                    background: "rgba(255,255,255,0.55)",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.85)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#1a1209", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {event.title}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#bbb" }}>
                      {organizer?.full_name ?? "Unknown"} · {event.city ?? "Online"}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                      background: statusStyle.bg,
                      color: statusStyle.text,
                      flexShrink: 0,
                    }}
                  >
                    {event.status}
                  </span>
                </Link>
              );
            })}
            {data.recentEvents.length === 0 && (
              <p style={{ margin: 0, fontSize: 13, color: "#aaa", textAlign: "center", padding: "2rem 0" }}>
                No events yet
              </p>
            )}
          </div>
        </Card>

        {/* Quick Links */}
        <Card style={{ padding: "1.5rem", display: "flex", flexDirection: "column" }}>
          <CardHeader label="Quick Links" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "0.7rem 1rem",
                  background: "rgba(255,255,255,0.55)",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.85)",
                  textDecoration: "none",
                  color: "#1a1209",
                  fontSize: 14,
                  fontWeight: 500,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ color: "#E07010", display: "flex" }}>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
