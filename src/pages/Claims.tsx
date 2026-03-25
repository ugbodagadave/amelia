import { useEffect, useMemo, useState } from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import {
  CalendarBlankIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  EyeIcon,
  DownloadSimpleIcon,
  SparkleIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { format } from "date-fns"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { CLAIM_WORKFLOW_STEP, type ClaimScoreBand } from "@/lib/claims"
import type { DateRange } from "react-day-picker"

function formatCurrency(value: number) {
  return value.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  })
}

function formatDate(value?: number | null) {
  if (!value) {
    return "Not submitted"
  }

  return new Date(value).toLocaleDateString("en-NG")
}

function formatPeriodDate(value?: Date) {
  return value ? format(value, "PPP") : "Pick a date"
}

function scoreTone(scoreBand: ClaimScoreBand) {
  if (scoreBand === "green") {
    return "text-green-700"
  }

  if (scoreBand === "amber") {
    return "text-amber-700"
  }

  return "text-red-700"
}

const CLAIM_PROGRESS_STEPS = [
  CLAIM_WORKFLOW_STEP.VALIDATE_AUTH_CODES,
  CLAIM_WORKFLOW_STEP.APPLY_TEMPLATE,
  CLAIM_WORKFLOW_STEP.POPULATE_FIELDS,
  CLAIM_WORKFLOW_STEP.CALCULATE_TOTALS,
  CLAIM_WORKFLOW_STEP.GENERATE_COVER_LETTER,
]

const CLAIM_CANDIDATES_PER_PAGE = 10

export function ClaimsPage() {
  const candidates = useQuery(api.claims.listClaimCandidates)
  const claimBatches = useQuery(api.claims.listClaimBatches)
  const hmoTemplates = useQuery(api.patients.listHmoTemplates)
  const clinic = useQuery(api.clinics.getCurrentClinic)
  const scoreClaimCompleteness = useAction(api.claims.scoreClaimCompleteness)
  const generateClaimBatch = useAction(api.claims.generateClaimBatch)
  const submitClaimBatch = useMutation(api.claims.submitClaimBatch)
  const markClaimBatchPaid = useMutation(api.claims.markClaimBatchPaid)
  const getClaimActionableInsights = useAction(api.claims.getClaimActionableInsights)

  const [selectedBillIds, setSelectedBillIds] = useState<Id<"bills">[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [tpaName, setTpaName] = useState("")
  const [tpaEmail, setTpaEmail] = useState("")
  const [medicalDirectorName, setMedicalDirectorName] = useState("")
  const [scoreResults, setScoreResults] = useState<
    Array<{
      billId: string
      patientName: string
      score: number
      band: ClaimScoreBand
      summary: string
      blockingIssues: string[]
      warningIssues: string[]
      canGenerate: boolean
    }>
  >([])
  const [showAllScoreResults, setShowAllScoreResults] = useState(false)
  const [expandedInsightBillIds, setExpandedInsightBillIds] = useState<string[]>([])
  const [actionableInsightMap, setActionableInsightMap] = useState<
    Record<string, { patientName: string; insights: string[] }>
  >({})
  const [loadingInsightBillIds, setLoadingInsightBillIds] = useState<string[]>([])
  const [isScoring, setIsScoring] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [generatedBatch, setGeneratedBatch] = useState<{
    claimBatchId: string
    mergedPdfUrl: string | null
    zipBundleUrl: string | null
    coverLetterUrl: string | null
    claimFiles: Array<{ billId: string; claimPdfUrl: string | null; fileName: string }>
  } | null>(null)
  const [candidatePage, setCandidatePage] = useState(1)

  const selectedTemplate = hmoTemplates?.find((template) => template._id === selectedTemplateId) ?? null

  useEffect(() => {
    if (selectedTemplate) {
      setTpaName(selectedTemplate.tpaName ?? "")
      setTpaEmail(selectedTemplate.tpaEmail ?? "")
    }
  }, [selectedTemplate])

  useEffect(() => {
    if (clinic?.medicalDirectorName) {
      setMedicalDirectorName(clinic.medicalDirectorName)
    }
  }, [clinic?.medicalDirectorName])

  useEffect(() => {
    setPeriodStart(dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "")
    setPeriodEnd(dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "")
  }, [dateRange])

  const selectedCandidates = useMemo(
    () => (candidates ?? []).filter((candidate) => selectedBillIds.includes(candidate._id)),
    [candidates, selectedBillIds],
  )
  const totalCandidatePages = Math.max(
    1,
    Math.ceil((candidates?.length ?? 0) / CLAIM_CANDIDATES_PER_PAGE),
  )
  const paginatedCandidates = useMemo(() => {
    const start = (candidatePage - 1) * CLAIM_CANDIDATES_PER_PAGE
    return (candidates ?? []).slice(start, start + CLAIM_CANDIDATES_PER_PAGE)
  }, [candidatePage, candidates])
  const selectableCandidateIds = useMemo(
    () => (candidates ?? []).filter((candidate) => !candidate.isLocked).map((candidate) => candidate._id),
    [candidates],
  )

  useEffect(() => {
    if (candidatePage > totalCandidatePages) {
      setCandidatePage(totalCandidatePages)
    }
  }, [candidatePage, totalCandidatePages])

  const batchSummary = selectedCandidates.reduce(
    (summary, candidate) => ({
      count: summary.count + 1,
      totalAmount: summary.totalAmount + candidate.amount,
      expectedReceivable: summary.expectedReceivable + candidate.expectedReceivable,
    }),
    { count: 0, totalAmount: 0, expectedReceivable: 0 },
  )
  const claimsWithIssuesCount = scoreResults.filter(
    (result) => result.blockingIssues.length > 0 || result.warningIssues.length > 0,
  ).length
  const readyClaimsCount = scoreResults.filter((result) => result.canGenerate).length
  const visibleScoreResults = useMemo(() => {
    if (showAllScoreResults) {
      return scoreResults
    }

    return scoreResults.filter(
      (result) => result.blockingIssues.length > 0 || result.warningIssues.length > 0,
    )
  }, [scoreResults, showAllScoreResults])

  function toggleBillSelection(billId: Id<"bills">, checked: boolean) {
    setSelectedBillIds((current) => {
      if (checked) {
        return current.includes(billId) ? current : [...current, billId]
      }

      return current.filter((currentBillId) => currentBillId !== billId)
    })
  }

  function toggleAllSelection(checked: boolean) {
    setSelectedBillIds((current) => {
      if (checked) {
        return selectableCandidateIds
      }

      return current.filter((billId) => !selectableCandidateIds.includes(billId))
    })
  }

  const allSelectableSelected =
    selectableCandidateIds.length > 0 &&
    selectableCandidateIds.every((candidateId) => selectedBillIds.includes(candidateId))

  async function handleScoreClaims() {
    if (selectedBillIds.length === 0) {
      toast.error("Select at least one HMO bill before scoring.")
      return
    }

    setIsScoring(true)
    try {
      const results = await scoreClaimCompleteness({ billIds: selectedBillIds as never[] })
      setScoreResults(results as typeof scoreResults)
      setShowAllScoreResults(false)
      setExpandedInsightBillIds([])
      setActionableInsightMap({})
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to score claims.")
    } finally {
      setIsScoring(false)
    }
  }

  async function handleToggleInsights(result: (typeof scoreResults)[number]) {
    const isExpanded = expandedInsightBillIds.includes(result.billId)
    if (isExpanded) {
      setExpandedInsightBillIds((current) => current.filter((billId) => billId !== result.billId))
      return
    }

    setExpandedInsightBillIds((current) => [...current, result.billId])
    if (actionableInsightMap[result.billId]) {
      return
    }

    setLoadingInsightBillIds((current) => [...current, result.billId])
    try {
      const response = await getClaimActionableInsights({ billId: result.billId as never })
      setActionableInsightMap((current) => ({
        ...current,
        [result.billId]: response as { patientName: string; insights: string[] },
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load actionable insights.")
      setExpandedInsightBillIds((current) => current.filter((billId) => billId !== result.billId))
    } finally {
      setLoadingInsightBillIds((current) => current.filter((billId) => billId !== result.billId))
    }
  }

  async function handleGenerateBatch() {
    if (!selectedTemplateId || !periodStart || !periodEnd) {
      toast.error("Complete the claim options form before generating the batch.")
      return
    }

    setIsGenerating(true)
    setGenerationStep(1)

    try {
      const scoredClaims =
        scoreResults.length > 0
          ? scoreResults
          : ((await scoreClaimCompleteness({
              billIds: selectedBillIds as never[],
            })) as typeof scoreResults)

      setScoreResults(scoredClaims)

      if (scoredClaims.some((result) => !result.canGenerate)) {
        toast.error("Resolve the blocking claim issues before generating the batch.")
        return
      }

      setGenerationStep(2)
      setGenerationStep(3)
      setGenerationStep(4)
      setGenerationStep(5)

      const result = await generateClaimBatch({
        billIds: selectedBillIds as never[],
        templateId: selectedTemplateId as never,
        periodStart,
        periodEnd,
        tpaName,
        tpaEmail,
        medicalDirectorName,
      })

      setGeneratedBatch(result as typeof generatedBatch)
      toast.success("Claim batch generated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate the claim batch.")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSubmitBatch(claimBatchId: string) {
    try {
      await submitClaimBatch({
        claimBatchId: claimBatchId as never,
        tpaName,
        tpaEmail,
      })
      toast.success("Claim batch marked as submitted to the TPA.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit the batch.")
    }
  }

  async function handleMarkBatchPaid(claimBatchId: string) {
    try {
      await markClaimBatchPaid({ claimBatchId: claimBatchId as never })
      toast.success("Claim batch marked as paid.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to mark the batch as paid.")
    }
  }

  if (candidates === undefined || claimBatches === undefined || hmoTemplates === undefined || clinic === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xl">Claims</CardTitle>
          <CardDescription>Loading claim candidates, templates, and batch history.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-muted-foreground">
          <Spinner />
          <span>Fetching the claims workspace...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.95fr)]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xl">Claim-ready HMO bills</CardTitle>
            <CardDescription>
              Select paid or auth-confirmed HMO bills that are ready for the next TPA submission.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {candidates.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClipboardTextIcon />
                  </EmptyMedia>
                  <EmptyTitle>No authorized bills ready for claiming</EmptyTitle>
                  <EmptyDescription>
                    Confirm auth codes and collect payment on HMO bills before claim generation.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border p-3">
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <Checkbox
                      checked={allSelectableSelected}
                      onCheckedChange={(checked) => toggleAllSelection(checked === true)}
                      aria-label="Select all available claim candidates"
                    />
                    <span>Select all available</span>
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Showing {paginatedCandidates.length} of {candidates.length} ready HMO bills
                  </p>
                </div>

                <ScrollArea className="h-[40rem] border">
                  <div className="flex flex-col">
                    {paginatedCandidates.map((candidate) => (
                      <label
                        key={candidate._id}
                        className="flex cursor-pointer items-start gap-3 border-b p-4 last:border-b-0"
                      >
                        <Checkbox
                          checked={selectedBillIds.includes(candidate._id)}
                          disabled={candidate.isLocked}
                          onCheckedChange={(checked) =>
                            toggleBillSelection(candidate._id, checked === true)
                          }
                          aria-label={`Select ${candidate.patientName}`}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">{candidate.patientName}</p>
                              <p className="text-sm text-muted-foreground">{candidate.hmoName}</p>
                            </div>
                            <p className="font-mono text-sm">{formatCurrency(candidate.amount)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span>Auth: {candidate.authorizationCode ?? "Missing"}</span>
                            <span>Receivable: {formatCurrency(candidate.expectedReceivable)}</span>
                            <span>Status: {candidate.status}</span>
                          </div>
                          {candidate.isLocked ? (
                            <p className="text-sm text-red-700">{candidate.lockReason}</p>
                          ) : null}
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>

                <Pagination className="justify-end">
                  <PaginationContent className="rounded-none border bg-background p-1">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCandidatePage((current) => Math.max(1, current - 1))}
                        disabled={candidatePage === 1}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalCandidatePages }, (_, index) => index + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === candidatePage}
                          size="icon-xs"
                          onClick={() => setCandidatePage(page)}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCandidatePage((current) => Math.min(totalCandidatePages, current + 1))
                        }
                        disabled={candidatePage === totalCandidatePages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xl">TPA submission tracker</CardTitle>
            <CardDescription>
              Track draft, submitted, overdue, and paid claim batches from the same workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {claimBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No claim batches generated yet.</p>
            ) : (
              claimBatches.map((batch) => (
                <div key={batch._id} className="flex flex-col gap-3 border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{batch.hmoName}</p>
                      <p className="text-sm text-muted-foreground">
                        {batch.tpaName} · {batch.claimCount} claims
                      </p>
                    </div>
                    <p className="font-mono text-sm">{formatCurrency(batch.totalClaimed)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>Status: {batch.status}</span>
                    <span>Submitted: {formatDate(batch.submittedAt)}</span>
                    <span>Expected payment: {formatDate(batch.expectedPaymentBy)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {batch.zipBundleUrl ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={batch.zipBundleUrl} target="_blank" rel="noreferrer">
                          <DownloadSimpleIcon data-icon="inline-start" />
                          ZIP bundle
                        </a>
                      </Button>
                    ) : null}
                    {batch.status === "draft" ? (
                      <Button size="sm" onClick={() => void handleSubmitBatch(batch._id)}>
                        Submit to TPA
                      </Button>
                    ) : null}
                    {batch.status !== "paid" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleMarkBatchPaid(batch._id)}
                      >
                        Mark as Paid
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xl">Claim options</CardTitle>
            <CardDescription>
              Choose the HMO template, TPA details, and period covered before generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>HMO Template</FieldLabel>
                <FieldContent>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an HMO template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {hmoTemplates.map((template) => (
                          <SelectItem key={template._id} value={template._id}>
                            {template.hmoName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="tpa-name">TPA Name</FieldLabel>
                <FieldContent>
                  <Input id="tpa-name" value={tpaName} onChange={(event) => setTpaName(event.target.value)} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="tpa-email">TPA Email</FieldLabel>
                <FieldContent>
                  <Input
                    id="tpa-email"
                    type="email"
                    value={tpaEmail}
                    onChange={(event) => setTpaEmail(event.target.value)}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Period covered</FieldLabel>
                <FieldContent>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarBlankIcon data-icon="inline-start" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            `${formatPeriodDate(dateRange.from)} - ${formatPeriodDate(dateRange.to)}`
                          ) : (
                            formatPeriodDate(dateRange.from)
                          )
                        ) : (
                          <span>Select submission period</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <PopoverHeader className="border-b p-3">
                        <PopoverTitle>Claim period</PopoverTitle>
                        <PopoverDescription>
                          Choose the billing window covered by this batch submission to the TPA.
                        </PopoverDescription>
                      </PopoverHeader>
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldDescription>
                    This is the claim submission window covered by the batch, not each patient&apos;s
                    admission and discharge dates.
                  </FieldDescription>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="medical-director-name">Medical Director Name</FieldLabel>
                <FieldContent>
                  <Input
                    id="medical-director-name"
                    value={medicalDirectorName}
                    onChange={(event) => setMedicalDirectorName(event.target.value)}
                  />
                  <FieldDescription>
                    Used in the cover letter signature block and can be edited per batch.
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xl">Claim readiness</CardTitle>
            <CardDescription>
              Review the selected batch total, expected receivable, and per-bill completeness score.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 border p-4">
              <p className="text-sm text-muted-foreground">Selected bills: {batchSummary.count}</p>
              <p className="font-mono text-sm">Total billed: {formatCurrency(batchSummary.totalAmount)}</p>
              <p className="font-mono text-sm">
                Net receivable: {formatCurrency(batchSummary.expectedReceivable)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleScoreClaims()} disabled={isScoring}>
                {isScoring ? <Spinner data-icon="inline-start" /> : <WarningIcon data-icon="inline-start" />}
                Score claims
              </Button>
              <Button onClick={() => void handleGenerateBatch()} disabled={isGenerating}>
                {isGenerating ? <Spinner data-icon="inline-start" /> : <CheckCircleIcon data-icon="inline-start" />}
                Generate claim batch
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Scores combine hard validation checks with advisory AI warnings when Groq scoring is
              available. A high score can still include non-blocking suggestions.
            </p>

            {isGenerating ? (
              <div className="grid gap-3 border p-4">
                <Progress value={(generationStep / CLAIM_PROGRESS_STEPS.length) * 100} />
                <div className="grid gap-1">
                  {CLAIM_PROGRESS_STEPS.map((step, index) => (
                    <p
                      key={step}
                      className={index + 1 <= generationStep ? "text-sm font-medium" : "text-sm text-muted-foreground"}
                    >
                      {index + 1}. {step}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {scoreResults.length > 0 ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border p-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>Scored: {scoreResults.length}</span>
                    <span>Needs attention: {claimsWithIssuesCount}</span>
                    <span>Ready: {readyClaimsCount}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowAllScoreResults((current) => !current)}
                  >
                    <EyeIcon data-icon="inline-start" />
                    {showAllScoreResults ? "Hide clean claims" : "View all"}
                  </Button>
                </div>

                {visibleScoreResults.length === 0 ? (
                  <p className="border p-4 text-sm text-muted-foreground">
                    No issues found in the current score run. Use View all to inspect every claim.
                  </p>
                ) : null}

                {visibleScoreResults.map((result) => {
                  const issueTone =
                    result.blockingIssues.length > 0
                      ? "text-red-700"
                      : result.warningIssues.length > 0
                        ? "text-amber-700"
                        : "text-muted-foreground"
                  const issueCount = result.blockingIssues.length + result.warningIssues.length
                  const isExpanded = expandedInsightBillIds.includes(result.billId)
                  const isLoadingInsights = loadingInsightBillIds.includes(result.billId)
                  const actionableInsights = actionableInsightMap[result.billId]?.insights ?? []

                  return (
                    <Collapsible key={result.billId} open={isExpanded}>
                      <div className="grid gap-3 border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{result.patientName}</p>
                            <p className={`line-clamp-2 text-sm ${issueTone}`}>{result.summary}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono text-sm ${scoreTone(result.band)}`}>{result.score}/100</p>
                            <p className="text-xs text-muted-foreground">
                              {issueCount > 0 ? `${issueCount} issue${issueCount === 1 ? "" : "s"}` : "Ready"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => void handleToggleInsights(result)}
                            >
                              <SparkleIcon data-icon="inline-start" />
                              Actionable insights
                              {isExpanded ? (
                                <CaretUpIcon data-icon="inline-end" />
                              ) : (
                                <CaretDownIcon data-icon="inline-end" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          {result.blockingIssues.length > 0 ? (
                            <span className="text-xs text-red-700">Blocking issues present</span>
                          ) : result.warningIssues.length > 0 ? (
                            <span className="text-xs text-amber-700">Warnings only</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No issues detected</span>
                          )}
                        </div>

                        <CollapsibleContent className="grid gap-2 border-t pt-3">
                          {isLoadingInsights ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Spinner />
                              <span>Loading short corrective actions...</span>
                            </div>
                          ) : (
                            actionableInsights.map((insight) => (
                              <p key={insight} className="text-sm text-foreground">
                                {insight}
                              </p>
                            ))
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {generatedBatch ? (
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-xl">Generated files</CardTitle>
              <CardDescription>
                Download the merged PDF, ZIP bundle, cover letter, or each individual claim file.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {generatedBatch.mergedPdfUrl ? (
                  <Button asChild variant="outline">
                    <a href={generatedBatch.mergedPdfUrl} target="_blank" rel="noreferrer">
                      <DownloadSimpleIcon data-icon="inline-start" />
                      Merged PDF
                    </a>
                  </Button>
                ) : null}
                {generatedBatch.zipBundleUrl ? (
                  <Button asChild variant="outline">
                    <a href={generatedBatch.zipBundleUrl} target="_blank" rel="noreferrer">
                      <DownloadSimpleIcon data-icon="inline-start" />
                      ZIP bundle
                    </a>
                  </Button>
                ) : null}
                {generatedBatch.coverLetterUrl ? (
                  <Button asChild variant="outline">
                    <a href={generatedBatch.coverLetterUrl} target="_blank" rel="noreferrer">
                      <DownloadSimpleIcon data-icon="inline-start" />
                      Cover letter
                    </a>
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2">
                {generatedBatch.claimFiles.map((claimFile) =>
                  claimFile.claimPdfUrl ? (
                    <a
                      key={claimFile.billId}
                      href={claimFile.claimPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      {claimFile.fileName}
                    </a>
                  ) : null,
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
