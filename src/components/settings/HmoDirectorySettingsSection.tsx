import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import {
  BuildingsIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react"

import { api } from "../../../convex/_generated/api"
import { HMO_DIRECTORY_SEED_RECORDS } from "@/lib/hmoDirectorySeed"
import {
  buildHmoDirectorySummary,
  filterHmoDirectoryRows,
  mapDirectoryRecordsToRows,
  mapTemplatesToDirectoryRows,
  type HmoDirectoryRow,
} from "@/lib/hmoDirectory"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function SummaryStatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <Card className="border-border/80 bg-muted/30">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </span>
          <span className="font-mono text-2xl font-bold text-foreground">{value}</span>
        </div>
        <div className="flex size-9 items-center justify-center border border-border bg-background text-muted-foreground">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function DirectoryTable({ rows, emptyTitle }: { rows: HmoDirectoryRow[]; emptyTitle: string }) {
  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IdentificationCardIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>
            Try a different search term or switch tabs to inspect the other directory view.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-64">HMO</TableHead>
            <TableHead className="min-w-44">Aliases</TableHead>
            <TableHead className="min-w-56">Contact email</TableHead>
            <TableHead className="min-w-44">Contact phone</TableHead>
            <TableHead className="min-w-40">Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="align-top">
                <div className="flex flex-col gap-2">
                  <span className="font-medium">{row.name}</span>
                  {row.aliasCount > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {row.aliases.slice(0, 3).map((alias) => (
                        <Badge key={alias} variant="outline" className="font-mono text-[10px]">
                          {alias}
                        </Badge>
                      ))}
                      {row.aliasCount > 3 ? (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          +{row.aliasCount - 3} more
                        </Badge>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No alternate aliases</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {row.aliasCount} alias{row.aliasCount === 1 ? "" : "es"}
                </Badge>
              </TableCell>
              <TableCell className="align-top">
                {row.contactEmail ? (
                  <span className="text-sm">{row.contactEmail}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">No public email captured</span>
                )}
              </TableCell>
              <TableCell className="align-top">
                {row.contactPhone ? (
                  <span className="font-mono text-sm">{row.contactPhone}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">No public phone captured</span>
                )}
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-col gap-2">
                  <Badge variant="outline" className="w-fit font-mono text-[10px] uppercase">
                    {row.sourceType.replace("_", " ")}
                  </Badge>
                  <Badge variant="secondary" className="w-fit font-mono text-[10px] uppercase">
                    {row.directoryConfidence}
                  </Badge>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

export function HmoDirectorySettingsSection() {
  const hmoTemplates = useQuery(api.patients.listHmoTemplates)
  const [directorySearch, setDirectorySearch] = useState("")

  const clinicDirectoryRows = useMemo(
    () => mapTemplatesToDirectoryRows(hmoTemplates ?? []),
    [hmoTemplates],
  )
  const seedDirectoryRows = useMemo(
    () => mapDirectoryRecordsToRows(HMO_DIRECTORY_SEED_RECORDS),
    [],
  )
  const filteredClinicDirectoryRows = useMemo(
    () => filterHmoDirectoryRows(clinicDirectoryRows, directorySearch),
    [clinicDirectoryRows, directorySearch],
  )
  const filteredSeedDirectoryRows = useMemo(
    () => filterHmoDirectoryRows(seedDirectoryRows, directorySearch),
    [seedDirectoryRows, directorySearch],
  )
  const clinicSummary = useMemo(
    () => buildHmoDirectorySummary(clinicDirectoryRows),
    [clinicDirectoryRows],
  )

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle className="font-mono text-xl">HMO Directory</CardTitle>
        <CardAction className="w-full sm:w-80">
          <div className="relative w-full">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={directorySearch}
              onChange={(event) => setDirectorySearch(event.target.value)}
              placeholder="Search HMO, alias, email, or phone"
              className="pl-10"
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryStatCard
            title="Clinic Directory"
            value={clinicSummary.total.toLocaleString("en-NG")}
            icon={<BuildingsIcon />}
          />
          <SummaryStatCard
            title="With Email"
            value={clinicSummary.withEmail.toLocaleString("en-NG")}
            icon={<ShieldCheckIcon />}
          />
          <SummaryStatCard
            title="With Phone"
            value={clinicSummary.withPhone.toLocaleString("en-NG")}
            icon={<PhoneIcon />}
          />
        </div>

        <Separator />

        <Tabs defaultValue="clinic">
          <TabsList className="gap-2 bg-transparent p-0">
            <TabsTrigger
              value="clinic"
              className="border border-border bg-background px-3 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Clinic Directory
              <Badge variant="secondary" className="ml-2 font-mono text-[10px]">
                {clinicSummary.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="seed"
              className="border border-border bg-background px-3 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Seed Reference
              <Badge variant="secondary" className="ml-2 font-mono text-[10px]">
                {seedDirectoryRows.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clinic" className="mt-6 flex flex-col gap-4">
            {hmoTemplates === undefined ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Spinner />
                <span>Loading clinic HMO directory...</span>
              </div>
            ) : (
              <DirectoryTable
                rows={filteredClinicDirectoryRows}
                emptyTitle="No clinic HMO records match this search"
              />
            )}
          </TabsContent>

          <TabsContent value="seed" className="mt-6 flex flex-col gap-4">
            <DirectoryTable
              rows={filteredSeedDirectoryRows}
              emptyTitle="No seed HMO records match this search"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
