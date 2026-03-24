import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"
import { useState } from "react"
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

function formatCurrency(value: number) {
  return value.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  })
}

export function ServiceSelector({
  services,
  value,
  onSelect,
}: {
  services: Array<{
    _id: string
    name: string
    defaultPrice: number
  }>
  value: string
  onSelect: (payload: { name: string; defaultPrice?: number }) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const normalizedSearch = search.trim().toLowerCase()
  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(normalizedSearch),
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="justify-between">
          <span className="truncate">{value || "Select or type a service"}</span>
          <MagnifyingGlassIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-0">
        <Command>
          <CommandInput
            placeholder="Search service catalog"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No exact match in catalog.</CommandEmpty>
            <ScrollArea className="max-h-64">
              <CommandGroup>
                {filteredServices.map((service) => (
                  <CommandItem
                    key={service._id}
                    value={service.name}
                    onSelect={() => {
                      onSelect({ name: service.name, defaultPrice: service.defaultPrice })
                      setOpen(false)
                    }}
                  >
                    <div className="flex w-full min-w-0 items-center gap-3">
                      <span className="min-w-0 flex-1 truncate">{service.name}</span>
                      <span className="w-24 text-right font-mono text-muted-foreground">
                        {formatCurrency(service.defaultPrice)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
        {search.trim() ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                onSelect({ name: search.trim() })
                setOpen(false)
              }}
            >
              <PlusIcon data-icon="inline-start" />
              Use and add "{search.trim()}"
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
