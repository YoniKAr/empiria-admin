// ─── Currency ───

const CURRENCY_MAP: Record<string, { symbol: string; decimals: number }> = {
  cad: { symbol: "CA$", decimals: 2 },
  usd: { symbol: "$", decimals: 2 },
  inr: { symbol: "₹", decimals: 2 },
  gbp: { symbol: "£", decimals: 2 },
  eur: { symbol: "€", decimals: 2 },
  aud: { symbol: "A$", decimals: 2 },
  nzd: { symbol: "NZ$", decimals: 2 },
  sgd: { symbol: "S$", decimals: 2 },
  hkd: { symbol: "HK$", decimals: 2 },
  jpy: { symbol: "¥", decimals: 0 },
  mxn: { symbol: "MX$", decimals: 2 },
  brl: { symbol: "R$", decimals: 2 },
};

export function formatCurrency(amount: number, currency = "cad"): string {
  const c = CURRENCY_MAP[currency.toLowerCase()] ?? {
    symbol: currency.toUpperCase() + " ",
    decimals: 2,
  };
  return `${c.symbol}${amount.toFixed(c.decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function getCurrencySymbol(currency = "cad"): string {
  return CURRENCY_MAP[currency.toLowerCase()]?.symbol ?? currency.toUpperCase();
}

// ─── Dates ───

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

// ─── Misc ───

export function truncate(str: string, max = 50): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
