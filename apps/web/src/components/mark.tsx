import Image from "next/image";
import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex h-14 w-[69px] shrink-0 items-center", className)}
      aria-hidden
    >
      <Image
        src="/logos/swiper.svg"
        alt=""
        width={970}
        height={786}
        className="h-full w-full"
        unoptimized
        loading="eager"
      />
    </span>
  );
}
