import { Badge } from "@/components/ui/badge"

export function LiveBadge() {
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 font-mono text-[10px] uppercase tracking-widest"
    >
      <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
      Live
    </Badge>
  )
}
