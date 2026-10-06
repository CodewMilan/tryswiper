import { eq } from "drizzle-orm";
import { schema } from "@swiper/db";
import { db } from "@/lib/db";

export async function getBilling(workspaceId: string) {
  const [row] = await db
    .select()
    .from(schema.billing)
    .where(eq(schema.billing.workspaceId, workspaceId))
    .limit(1);
  return row ?? null;
}

export async function recordBilling(input: {
  workspaceId: string;
  plan: "free" | "pro";
  status: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  paymentId?: string | null;
}) {
  const [workspace] = await db
    .select({ id: schema.workspace.id })
    .from(schema.workspace)
    .where(eq(schema.workspace.id, input.workspaceId))
    .limit(1);
  if (!workspace) return false;

  const current = await getBilling(input.workspaceId);
  const values = {
    workspaceId: input.workspaceId,
    plan: input.plan,
    status: input.status,
    dodoCustomerId: input.customerId ?? current?.dodoCustomerId ?? null,
    dodoSubscriptionId: input.subscriptionId ?? current?.dodoSubscriptionId ?? null,
    dodoPaymentId: input.paymentId ?? current?.dodoPaymentId ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(schema.billing)
    .values(values)
    .onConflictDoUpdate({
      target: schema.billing.workspaceId,
      set: {
        plan: values.plan,
        status: values.status,
        dodoCustomerId: values.dodoCustomerId,
        dodoSubscriptionId: values.dodoSubscriptionId,
        dodoPaymentId: values.dodoPaymentId,
        updatedAt: values.updatedAt,
      },
    });
  return true;
}
