"use client";

import { useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const clerk = useClerk();
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-light hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={() => {
        void clerk.signOut({ redirectUrl: "/" });
      }}
    >
      Sign out
    </button>
  );
}
