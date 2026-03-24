import { Link, useParams } from "react-router-dom"
import { useQuery } from "convex/react"
import { CalendarBlankIcon, CreditCardIcon, FileTextIcon, UserCircleIcon } from "@phosphor-icons/react"
import { api } from "../../convex/_generated/api"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
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
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border p-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

export function PatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const patient = useQuery(
    api.patients.getById,
    patientId ? { patientId: patientId as never } : "skip",
  )

  if (!patientId || patient === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xl">Patient Profile</CardTitle>
          <CardDescription>Loading patient profile and bill history.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-muted-foreground">
          <Spinner />
          <span>Fetching patient record...</span>
        </CardContent>
      </Card>
    )
  }

  if (patient === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xl">Patient not found</CardTitle>
          <CardDescription>The patient record could not be loaded for this clinic.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to={ROUTES.PATIENTS}>Back to patients</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <CardTitle className="font-mono text-xl">{patient.fullName}</CardTitle>
            <CardDescription>
              Patient record prepared for billing, authorization tracking, and claims.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={patient.paymentType === "hmo" ? "default" : "secondary"}>
              {patient.paymentType === "hmo" ? "HMO" : "Self-pay"}
            </Badge>
            <Button disabled>
              <CreditCardIcon data-icon="inline-start" />
              New Bill
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Date of birth" value={patient.dateOfBirth} />
          <DetailItem label="Age" value={patient.age === null ? "Unknown" : String(patient.age)} />
          <DetailItem label="Phone" value={patient.phone} />
          <DetailItem label="NIN" value={patient.maskedNin} />
          <DetailItem label="HMO" value={patient.hmoName ?? "Self-pay"} />
          <DetailItem label="NHIS Number" value={patient.enrolleeNhisNo ?? "Not provided"} />
          <DetailItem label="Sex" value={patient.sex === "male" ? "Male" : "Female"} />
          <DetailItem
            label="Created"
            value={new Date(patient.createdAt).toLocaleDateString("en-NG")}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-base">Insurance metadata</CardTitle>
              <CardDescription>
                Dynamic HMO identifiers captured during registration stay with the patient record.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {patient.hmoAdditionalFields?.length ? (
                patient.hmoAdditionalFields.map((field) => (
                  <DetailItem key={field.fieldKey} label={field.label} value={field.value} />
                ))
              ) : (
                <DetailItem label="Additional fields" value="No extra HMO identifiers captured." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-base">Bill history</CardTitle>
              <CardDescription>
                This tab becomes the handoff point into the Phase 3 bill builder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patient.billHistory.length ? (
                <div className="grid gap-3">
                  {patient.billHistory.map((bill) => (
                    <div
                      key={bill._id}
                      className="grid gap-2 border p-3 md:grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr]"
                    >
                      <div className="flex items-start gap-2">
                        <FileTextIcon className="mt-0.5 text-muted-foreground" />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{bill.diagnosis}</span>
                          <span className="text-muted-foreground">
                            Admission: {bill.dateAdmission || "Not recorded"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarBlankIcon />
                        <span>{new Date(bill.createdAt).toLocaleDateString("en-NG")}</span>
                      </div>
                      <div className="font-mono">
                        {bill.totalAmount.toLocaleString("en-NG", {
                          style: "currency",
                          currency: "NGN",
                          maximumFractionDigits: 0,
                        })}
                      </div>
                      <Badge variant="outline">{bill.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UserCircleIcon />
                    </EmptyMedia>
                    <EmptyTitle>No bills yet</EmptyTitle>
                    <EmptyDescription>
                      Billing unlocks in Phase 3. This profile is ready to receive its first bill.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button disabled>
                      <CreditCardIcon data-icon="inline-start" />
                      New Bill
                    </Button>
                  </EmptyContent>
                </Empty>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
