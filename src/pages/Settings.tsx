import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import {
  DotsThreeOutlineVerticalIcon,
  FirstAidKitIcon,
  NotePencilIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import {
  formatPriceInput,
  parsePriceInput,
  SERVICE_CATEGORY_OPTIONS,
  type ServiceCatalogCategory,
} from "@/lib/clinicOnboarding"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ServiceFormState {
  serviceId?: string
  name: string
  category: ServiceCatalogCategory
  defaultPrice: string
}

const INITIAL_SERVICE_FORM: ServiceFormState = {
  name: "",
  category: "consultation",
  defaultPrice: "",
}

export function SettingsPage() {
  const services = useQuery(api.serviceCatalog.listForClinic)
  const upsertService = useMutation(api.serviceCatalog.upsertService)
  const removeService = useMutation(api.serviceCatalog.removeService)
  type ServiceCatalogItem = NonNullable<typeof services>[number]

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null)
  const [formState, setFormState] = useState<ServiceFormState>(INITIAL_SERVICE_FORM)

  const openCreateDialog = () => {
    setFormState(INITIAL_SERVICE_FORM)
    setIsDialogOpen(true)
  }

  const openEditDialog = (service: NonNullable<typeof services>[number]) => {
    setFormState({
      serviceId: service._id,
      name: service.name,
      category: service.category,
      defaultPrice: formatPriceInput(String(service.defaultPrice)),
    })
    setIsDialogOpen(true)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const price = parsePriceInput(formState.defaultPrice)

    if (!formState.name.trim()) {
      toast.error("Service name is required.")
      return
    }

    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Default price must be greater than zero.")
      return
    }

    setIsSaving(true)

    try {
      await upsertService({
        serviceId: formState.serviceId as never,
        name: formState.name.trim(),
        category: formState.category,
        defaultPrice: price,
      })

      toast.success(formState.serviceId ? "Service updated." : "Service added.")
      setIsDialogOpen(false)
      setFormState(INITIAL_SERVICE_FORM)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save service.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (serviceId: string) => {
    setDeletingServiceId(serviceId)

    try {
      await removeService({ serviceId: serviceId as never })
      toast.success("Service removed.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove service.")
    } finally {
      setDeletingServiceId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle className="font-mono text-xl">Service catalog</CardTitle>
            <CardDescription>
              These prices were seeded during onboarding. Adjust them now so patient bills inherit
              the correct clinic defaults.
            </CardDescription>
          </div>
          <CardAction>
            <Button onClick={openCreateDialog} type="button">
              <PlusIcon data-icon="inline-start" />
              Add service
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {services === undefined ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Spinner />
              <span>Loading service catalog...</span>
            </div>
          ) : services.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FirstAidKitIcon />
                </EmptyMedia>
                <EmptyTitle>No services in this clinic catalog</EmptyTitle>
                <EmptyDescription>
                  Add at least one billable service before patient billing starts.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={openCreateDialog} type="button">
                  <PlusIcon data-icon="inline-start" />
                  Add the first service
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Default price</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service: ServiceCatalogItem) => (
                  <TableRow key={service._id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="capitalize">
                      {service.category.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      ₦{service.defaultPrice.toLocaleString("en-NG")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-label={`Actions for ${service.name}`} size="icon" variant="ghost">
                            <DotsThreeOutlineVerticalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(service)}>
                            <NotePencilIcon data-icon="inline-start" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(service._id)}
                            disabled={deletingServiceId === service._id}
                          >
                            <TrashIcon data-icon="inline-start" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">
              {formState.serviceId ? "Edit service" : "Add service"}
            </DialogTitle>
            <DialogDescription>
              Update your clinic's billable services and default prices without leaving the table.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-6 grid gap-4" onSubmit={handleSave}>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="service-name">
                Service name
              </label>
              <Input
                id="service-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Full Blood Count"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="service-category">
                Category
              </label>
              <Select
                value={formState.category}
                onValueChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    category: value as ServiceCatalogCategory,
                  }))
                }
              >
                <SelectTrigger id="service-category" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Billable categories</SelectLabel>
                    {SERVICE_CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="service-price">
                Default price
              </label>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>₦</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="service-price"
                  inputMode="numeric"
                  type="text"
                  value={formState.defaultPrice}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      defaultPrice: formatPriceInput(event.target.value),
                    }))
                  }
                  placeholder="10,000"
                />
              </InputGroup>
            </div>

            <Button disabled={isSaving} type="submit">
              {isSaving ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Saving service
                </>
              ) : formState.serviceId ? (
                "Save changes"
              ) : (
                "Add service"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
