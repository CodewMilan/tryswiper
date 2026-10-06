import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/paths";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect_url?: string }>;
}) {
  const session = await getSessionUser();
  const params = await searchParams;
  if (session) redirect(safeNextPath(params.next ?? params.redirect_url));

  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
