import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

export function PatientSelector({
  patients,
  value,
  onSelect,
}: {
  patients: Array<{
    _id: string
    fullName: string
    phone: string
    paymentType: "self_pay" | "hmo"
    hmoName: string | null
  }>
  value: string
  onSelect: (patientId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedPatient = patients.find((patient) => patient._id === value) ?? null
  const filteredPatients = patients.filter((patient) => {
    const haystack = `${patient.fullName} ${patient.phone}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="justify-between">
          {selectedPatient ? selectedPatient.fullName : "Select patient"}
          <MagnifyingGlassIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder="Search patient by name or phone"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No matching patients.</CommandEmpty>
            <ScrollArea className="max-h-64">
              <CommandGroup>
                {filteredPatients.map((patient) => (
                  <CommandItem
                    key={patient._id}
                    value={`${patient.fullName} ${patient.phone}`}
                    onSelect={() => {
                      onSelect(patient._id)
                      setOpen(false)
                    }}
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <span>{patient.fullName}</span>
                      <span className="text-muted-foreground">{patient.phone}</span>
                    </div>
                    <Badge variant={patient.paymentType === "hmo" ? "default" : "secondary"}>
                      {patient.paymentType === "hmo" ? patient.hmoName ?? "HMO" : "Self-pay"}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
