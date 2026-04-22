import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("skeleton-base", className)} {...props} />
  );
}
