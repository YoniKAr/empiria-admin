"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getOrders } from "@/lib/actions";
import { supabase } from "@/lib/supabase-client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/users", label: "Users" },
  { href: "/dashboard/tickets", label: "Tickets" },
  { href: "/dashboard/settings", label: "Settings" },
];

function IconBtn({ children, onClick, style, hasBadge }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; hasBadge?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 8,
        color: "#666",
        display: "flex",
        lineHeight: 0,
        position: "relative",
        ...style
      }}
    >
      {children}
      {hasBadge && (
        <span style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 8,
          height: 8,
          background: "#f98f1d",
          borderRadius: "50%",
          border: "2px solid #fff",
          boxShadow: "0 0 0 1px rgba(249,143,29,0.2)"
        }} />
      )}
    </button>
  );
}

export default function TopNav({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const fetchRecentNotifications = async () => {
    const res = await getOrders({ limit: 15 });
    const filtered = res.orders.filter((o: any) => 
      ["completed", "canceled", "refunded"].includes(o.status)
    ).slice(0, 8);
    setNotifications(filtered);
  };

  useEffect(() => {
    // Initial fetch
    fetchRecentNotifications();

    // Real-time subscription
    const channel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as any;
          if (["completed", "canceled", "refunded"].includes(newOrder.status)) {
            fetchRecentNotifications();
            if (!showNotifications) {
              setHasUnread(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showNotifications) {
      fetchRecentNotifications();
      setHasUnread(false);
    }
  }, [showNotifications]);

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 2rem",
        height: 58,
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,150,60,0.12)",
      }}
    >
      {/* Logo pill */}
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          marginRight: 16,
          flexShrink: 0,
          textDecoration: "none",
        }}
      >
        <Image
          src="/logo.png"
          alt="Empiria Events Logo"
          width={100}
          height={20}
          priority
        />
      </Link>

      {/* Nav links */}
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: "6px 15px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              background: isActive ? "#1a1209" : "transparent",
              color: isActive ? "#fff" : "#777",
              transition: "all 0.15s ease",
              textDecoration: "none",
            }}
          >
            {item.label}
          </Link>
        );
      })}

      <div style={{ flex: 1 }} />

      <div style={{ position: "relative" }} ref={notificationsRef}>
        <IconBtn
          onClick={() => {
            setShowNotifications(!showNotifications);
          }}
          style={{
            color: showNotifications ? "#f98f1d" : "#666",
            transition: "color 0.1s ease",
          }}
          hasBadge={hasUnread}
        >
          <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </IconBtn>

        {showNotifications && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 10,
              width: 300,
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
              border: "1px solid rgba(0,0,0,0.08)",
              overflow: "hidden",
              zIndex: 100,
              padding: "16px 8px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", padding: "0 12px 10px 12px", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid rgba(0,0,0,0.04)", marginBottom: 8 }}>
              Recent Activity
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: "12px 12px", color: "#888", fontSize: 13 }}>No recent order activity.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={`/dashboard/orders/${n.id}`}
                    onClick={() => setShowNotifications(false)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "10px 12px",
                      borderRadius: 8,
                      textDecoration: "none",
                      color: "#1a1209",
                      fontSize: 13,
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>Order {n.id.slice(-6).toUpperCase()}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                        backgroundColor: n.status === 'completed' ? '#ecfdf5' : n.status === 'canceled' ? '#fef2f2' : '#fff7ed',
                        color: n.status === 'completed' ? '#059669' : n.status === 'canceled' ? '#dc2626' : '#ea580c',
                      }}>
                        {n.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {n.event?.title || "Unknown Event"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/dashboard/orders"
              onClick={() => setShowNotifications(false)}
              style={{
                display: "block",
                textAlign: "center",
                padding: "10px",
                fontSize: 12,
                fontWeight: 600,
                color: "#f98f1d",
                textDecoration: "none",
                marginTop: 8,
                borderTop: "1px solid rgba(0,0,0,0.04)",
              }}
            >
              View all orders
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
