import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-black/8 bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}
