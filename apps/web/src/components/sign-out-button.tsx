"use client";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center rounded-md px-3 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
