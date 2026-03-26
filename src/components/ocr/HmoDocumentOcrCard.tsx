import { useEffect, useState } from "react"
import { FileTextIcon, IdentificationCardIcon } from "@phosphor-icons/react"

import type { ExtractHmoDetailsResult } from "@/lib/ocr"
import { SUPPORTED_OCR_MEDIA_TYPES } from "@/lib/ocr"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

interface HmoDocumentOcrCardProps {
  title: string
  description: string
  isExtracting: boolean
  result: ExtractHmoDetailsResult | null
  onExtract: (payload: {
    base64Data: string
    mediaType: string
    fileName: string
  }) => Promise<void>
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Unable to read the selected file."))
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      resolve(result.replace(/^data:[^;]+;base64,/, ""))
    }
    reader.readAsDataURL(file)
  })
}

function buildExtractedFieldBadges(result: ExtractHmoDetailsResult | null) {
  if (!result) {
    return []
  }

  const badges = [
    result.extracted.hmoName
      ? `HMO: ${result.extracted.hmoName}`
      : "",
    result.extracted.nhisNumber
      ? `NHIS: ${result.extracted.nhisNumber}`
      : "",
    result.extracted.authorizationCode
      ? `Auth: ${result.extracted.authorizationCode}`
      : "",
    result.extracted.coverageType
      ? `Cover: ${result.extracted.coverageType}`
      : "",
  ]

  return badges.filter(Boolean)
}

export function HmoDocumentOcrCard({
  title,
  description,
  isExtracting,
  result,
  onExtract,
}: HmoDocumentOcrCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setPreviewUrl("")
      return
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(nextPreviewUrl)

    return () => {
      URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [selectedFile])

  const extractedBadges = buildExtractedFieldBadges(result)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor={`${title}-ocr-file`}>Document</FieldLabel>
          <FieldContent>
            <Input
              id={`${title}-ocr-file`}
              type="file"
              accept={SUPPORTED_OCR_MEDIA_TYPES.join(",")}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setSelectedFile(file)
              }}
            />
            <FieldDescription>
              Accepted: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
            </FieldDescription>
          </FieldContent>
        </Field>

        {selectedFile ? (
          <Alert>
            <FileTextIcon />
            <AlertTitle>{selectedFile.name}</AlertTitle>
            <AlertDescription>
              {selectedFile.type || "Unknown file type"}
              {selectedFile.type.startsWith("image/") ? " • Image preview ready" : ""}
            </AlertDescription>
          </Alert>
        ) : null}

        {previewUrl ? (
          <div className="overflow-hidden border">
            <img
              src={previewUrl}
              alt="Selected HMO document preview"
              className="h-40 w-full object-cover"
            />
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          disabled={!selectedFile || isExtracting}
          onClick={() => {
            if (!selectedFile) {
              return
            }

            void (async () => {
              const base64Data = await fileToBase64(selectedFile)
              await onExtract({
                base64Data,
                mediaType: selectedFile.type,
                fileName: selectedFile.name,
              })
            })()
          }}
        >
          {isExtracting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <IdentificationCardIcon data-icon="inline-start" />
          )}
          Extract details
        </Button>

        {result ? (
          <div className="flex flex-col gap-3">
            <Alert>
              <IdentificationCardIcon />
              <AlertTitle>OCR extracted details</AlertTitle>
              <AlertDescription>
                Processed {result.audit.pagesProcessed} page
                {result.audit.pagesProcessed === 1 ? "" : "s"} with Mistral OCR.
              </AlertDescription>
            </Alert>

            {extractedBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extractedBadges.map((badge) => (
                  <Badge key={badge} variant="secondary">
                    {badge}
                  </Badge>
                ))}
              </div>
            ) : (
              <Alert>
                <FileTextIcon />
                <AlertTitle>No structured fields found</AlertTitle>
                <AlertDescription>
                  The OCR run completed, but no target HMO fields were confidently extracted.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
