import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { WorkspaceNav } from "@/components/workspace-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="hero-grid flex min-h-full flex-col">
      <WorkspaceNav />
      <div className="flex min-h-0 flex-1 flex-col pt-16 lg:pt-14">{children}</div>
    </div>
  );
}
