// Rates relative to USD, cached for 24 hours
export async function fetchRatesUSD(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 86400 },
    });
    const json = await res.json();
    return json.rates ?? {};
  } catch {
    return {};
  }
}

// Convert an amount from one currency to another using USD-base rates
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return amount;
  const fromRate = rates[f] ?? 1;
  const toRate = rates[t] ?? 1;
  return (amount / fromRate) * toRate;
}
