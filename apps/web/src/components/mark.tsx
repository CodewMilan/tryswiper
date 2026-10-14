import Image from "next/image";
import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center",
        className,
      )}
      aria-hidden
    >
      <Image src="/logos/swiper.svg" alt="" width={36} height={36} className="size-full" unoptimized loading="eager" />
    </span>
  );
}
