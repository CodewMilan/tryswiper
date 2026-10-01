import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white",
        className,
      )}
      aria-hidden
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3.5" y="6" width="11" height="12.5" rx="2.2" stroke="white" strokeWidth="1.6" />
        <path
          d="M8 4.2h8.2A2.3 2.3 0 0 1 18.5 6.5V14"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
