"use client";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-light hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={() =>
        authClient.signOut({
          fetchOptions: { onSuccess: () => location.assign("/") },
        })
      }
    >
      Sign out
    </button>
  );
}
