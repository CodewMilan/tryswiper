import { z } from "zod";
import { paidPlanForProduct, type ProductPlans } from "./plans";

const date = z.string().datetime({ offset: true });
export const subscriptionSchema = z.object({
  subscription_id: z.string().min(1),
  product_id: z.string().min(1),
  created_at: date,
  status: z.enum(["pending", "active", "on_hold", "paused", "cancelled", "failed", "expired", "past_due"]),
  customer: z.object({ customer_id: z.string().min(1) }),
  metadata: z.record(z.string(), z.string()).default({}),
  next_billing_date: date,
  expires_at: date.nullish(),
  cancel_at_next_billing_date: z.boolean(),
});
export type DodoSubscription = z.infer<typeof subscriptionSchema>;

export function subscriptionEntitlement(subscription: DodoSubscription, products: ProductPlans, now = new Date()) {
  const plan = paidPlanForProduct(subscription.product_id, products);
  const active = ["active", "past_due"].includes(subscription.status) && plan !== null;
  const expiry = subscription.expires_at ? new Date(subscription.expires_at) : null;
  const nextBilling = new Date(subscription.next_billing_date);
  // Dodo keeps access during past_due; use a short verification lease because a
  // missed end-of-grace webhook must not leave access enabled indefinitely.
  const periodEnd = subscription.status === "past_due" ? new Date(now.getTime() + 10 * 60_000) : nextBilling;
  const paidThrough = expiry && expiry < periodEnd ? expiry : periodEnd;
  return { plan: active && paidThrough > now ? plan! : "free" as const,
    status: subscription.status, paidThrough, cancelAtNextBilling: subscription.cancel_at_next_billing_date,
    productId: subscription.product_id, subscriptionCreatedAt: new Date(subscription.created_at) };
}
