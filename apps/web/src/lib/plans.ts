export const PLAN_IDS = ["free", "pro", "studio"] as const;
export type Plan = (typeof PLAN_IDS)[number];
export type PaidPlan = Exclude<Plan, "free">;

/** One catalogue for advertised prices, checkout verification and entitlements. */
export const PLANS = {
  free: { name: "Free", monthlyPriceCents: 0, description: "Try your first ideas.", limits: { carousel: 5, generation: 10, export: 20, publish: 0, jpg: false } },
  pro: { name: "Pro", monthlyPriceCents: 2900, description: "Build a steady posting rhythm.", limits: { carousel: 30, generation: 50, export: 200, publish: 100, jpg: true } },
  studio: { name: "Studio", monthlyPriceCents: 7900, description: "More room for a busy content calendar.", limits: { carousel: 100, generation: 150, export: 600, publish: 100, jpg: true } },
} as const;

export const PLAN_LIMITS = { free: PLANS.free.limits, pro: PLANS.pro.limits, studio: PLANS.studio.limits };
export function isPaidPlan(value: unknown): value is PaidPlan { return value === "pro" || value === "studio"; }
export function planName(value: unknown) { return isPaidPlan(value) ? PLANS[value].name : PLANS.free.name; }

export type ProductPlans = Record<PaidPlan, string>;
export function paidPlanForProduct(productId: string, products: ProductPlans): PaidPlan | null {
  // A product accidentally assigned to both tiers cannot grant either tier.
  if (products.pro && products.pro === products.studio) return null;
  if (products.pro && productId === products.pro) return "pro";
  if (products.studio && productId === products.studio) return "studio";
  return null;
}
