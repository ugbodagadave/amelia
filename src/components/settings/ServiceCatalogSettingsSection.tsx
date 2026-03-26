import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { FirstAidKitIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { api } from "../../../convex/_generated/api"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

function formEqual(a: ServiceFormState, b: ServiceFormState) {
  return a.name === b.name && a.category === b.category && a.defaultPrice === b.defaultPrice
}

export function ServiceCatalogSettingsSection() {
  const services = useQuery(api.serviceCatalog.listForClinic)
  const upsertService = useMutation(api.serviceCatalog.upsertService)
  const removeService = useMutation(api.serviceCatalog.removeService)
  type ServiceCatalogItem = NonNullable<typeof services>[number]

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formState, setFormState] = useState<ServiceFormState>(INITIAL_SERVICE_FORM)
  const [originalForm, setOriginalForm] = useState<ServiceFormState | null>(null)

  const isDirty = originalForm === null || !formEqual(formState, originalForm)
  const isEditMode = Boolean(formState.serviceId)

  const closeDialog = () => {
    setIsDialogOpen(false)
    setFormState(INITIAL_SERVICE_FORM)
    setOriginalForm(null)
  }

  const openCreateDialog = () => {
    setFormState(INITIAL_SERVICE_FORM)
    setOriginalForm(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (service: ServiceCatalogItem) => {
    const values: ServiceFormState = {
      serviceId: service._id,
      name: service.name,
      category: service.category,
      defaultPrice: formatPriceInput(String(service.defaultPrice)),
    }
    setFormState(values)
    setOriginalForm(values)
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
      closeDialog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save service.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!formState.serviceId) {
      return
    }

    setIsDeleting(true)
    try {
      await removeService({ serviceId: formState.serviceId as never })
      toast.success("Service removed.")
      closeDialog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove service.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle className="font-mono text-xl">Service catalog</CardTitle>
            <CardDescription>
              Manage your clinic&apos;s billable services and default prices.
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
                  <TableHead className="w-44">Category</TableHead>
                  <TableHead className="w-36">Default price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow
                    key={service._id}
                    className="cursor-pointer"
                    onClick={() => openEditDialog(service)}
                  >
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="capitalize">
                      {service.category.replace("_", " ")}
                    </TableCell>
                    <TableCell>₦{service.defaultPrice.toLocaleString("en-NG")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog()
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">
              {isEditMode ? "Edit service" : "Add service"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the service details. Changes only take effect when saved."
                : "Add a new billable service to your clinic catalog."}
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

            <div className="flex items-center justify-between pt-2">
              {isEditMode ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                >
                  {isDeleting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <TrashIcon data-icon="inline-start" />
                      Delete
                    </>
                  )}
                </Button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                {isEditMode && isDirty ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button
                  type={isEditMode && isDirty ? "submit" : "button"}
                  disabled={isSaving || isDeleting}
                  onClick={isEditMode && !isDirty ? closeDialog : undefined}
                >
                  {isSaving ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Saving…
                    </>
                  ) : !isEditMode ? (
                    "Add service"
                  ) : isDirty ? (
                    "Save changes"
                  ) : (
                    "Close"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
