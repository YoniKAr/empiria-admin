import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET;
    if (!key) throw new Error("Missing STRIPE_SECRET");
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}
