import { useQuery } from "convex/react"
import { BuildingsIcon, FirstAidKitIcon, ShieldCheckIcon } from "@phosphor-icons/react"
import { api } from "../../convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardPage() {
  const clinic = useQuery(api.clinics.getCurrentClinic)
  const services = useQuery(api.serviceCatalog.listForClinic)

  if (clinic === undefined || services === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xl">{clinic?.name ?? "Clinic workspace"}</CardTitle>
          <CardDescription>
            Phase 1 is active. Your clinic profile and starter catalog are now the source of truth
            for every patient and bill that follows.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1 border p-4">
            <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <BuildingsIcon />
              Facility code
            </span>
            <span className="text-sm font-medium">{clinic?.nhiaFacilityCode}</span>
          </div>
          <div className="grid gap-1 border p-4">
            <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <ShieldCheckIcon />
              Medical Director
            </span>
            <span className="text-sm font-medium">{clinic?.medicalDirectorName}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-xl">
            <FirstAidKitIcon />
            Starter catalog
          </CardTitle>
          <CardDescription>
            Review the seeded services in Settings before patient registration begins.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {services.slice(0, 8).map((service) => (
            <Badge key={service._id} variant="secondary">
              {service.name}
            </Badge>
          ))}
          {services.length > 8 ? (
            <Badge variant="outline">+{services.length - 8} more services</Badge>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
