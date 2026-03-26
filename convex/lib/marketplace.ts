import { ConvexError } from "convex/values"
import {
  buildMarketplaceTokenExpiresAt,
  extractMarketplaceAccountName,
  extractMarketplaceBankOptions,
  getMarketplaceNinVerificationResult,
  type MarketplaceAccountResolveResponse,
  type MarketplaceBankOption,
  type MarketplaceBankListResponse,
  type MarketplaceNinVerificationResponse,
} from "../../src/lib/payments"
import { NIGERIAN_BANK_OPTIONS } from "../../data/nigerian-banks"

const MARKETPLACE_REQUEST_TIMEOUT_MS = 8_000
let marketplaceTokenCache:
  | {
      accessToken: string
      expiresAt: number
    }
  | null = null

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), MARKETPLACE_REQUEST_TIMEOUT_MS)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ConvexError({
        code: "MARKETPLACE_TIMEOUT",
        message: "Marketplace request timed out.",
      })
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new ConvexError({
      code: "ENV_MISSING",
      message: `${name} is not configured for this deployment.`,
    })
  }

  return value
}

function encodeBasicAuthCredentials(clientId: string, clientSecret: string) {
  const utf8Bytes = new TextEncoder().encode(`${clientId}:${clientSecret}`)
  let binary = ""

  for (const byte of utf8Bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

export async function fetchMarketplaceToken() {
  if (marketplaceTokenCache && marketplaceTokenCache.expiresAt > Date.now()) {
    return {
      access_token: marketplaceTokenCache.accessToken,
    }
  }

  const clientId = requireEnv("ISW_MARKETPLACE_CLIENT_ID")
  const clientSecret = requireEnv("ISW_MARKETPLACE_CLIENT_SECRET")
  const credentials = encodeBasicAuthCredentials(clientId, clientSecret)
  const issuedAt = Date.now()

  const response = await fetchWithTimeout(`${requireEnv("ISW_MARKETPLACE_BASE_URL")}/passport/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new ConvexError({
      code: "MARKETPLACE_AUTH_FAILED",
      message: "Unable to obtain Marketplace access token.",
    })
  }

  const data = (await response.json()) as {
    access_token: string
    expires_in?: number
  }

  if (data.access_token) {
    marketplaceTokenCache = {
      accessToken: data.access_token,
      expiresAt: buildMarketplaceTokenExpiresAt(issuedAt, data.expires_in ?? 3600),
    }
  }

  return { access_token: data.access_token }
}

function buildMarketplaceHeaders(accessToken: string, contentType?: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  }
}

function resolveMarketplaceRoutingBaseUrl() {
  return "https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1"
}

export async function fetchMarketplaceBankList(accessToken: string): Promise<MarketplaceBankOption[]> {
  const response = await fetchWithTimeout(
    `${resolveMarketplaceRoutingBaseUrl()}/verify/identity/account-number/bank-list`,
    {
      headers: buildMarketplaceHeaders(accessToken),
    },
  )

  if (!response.ok) {
    throw new ConvexError({
      code: "BANK_LIST_FAILED",
      message: "Unable to load the bank list from Interswitch Marketplace.",
    })
  }

  const data = (await response.json()) as MarketplaceBankListResponse | Array<MarketplaceBankOption>
  const banks = extractMarketplaceBankOptions(data)

  return banks.length > 0 ? banks : NIGERIAN_BANK_OPTIONS
}

export async function resolveMarketplaceBankAccount(input: {
  accessToken: string
  accountNumber: string
  bankCode: string
}) {
  const response = await fetchWithTimeout(
    `${resolveMarketplaceRoutingBaseUrl()}/verify/identity/account-number/resolve`,
    {
      method: "POST",
      headers: buildMarketplaceHeaders(input.accessToken, "application/json"),
      body: JSON.stringify({
        accountNumber: input.accountNumber.trim(),
        bankCode: input.bankCode.trim(),
      }),
    },
  )

  if (!response.ok) {
    throw new ConvexError({
      code: "BANK_RESOLVE_FAILED",
      message: "Unable to verify the clinic payout account.",
    })
  }

  const data = (await response.json()) as MarketplaceAccountResolveResponse & {
    data?: {
      id?: string
      bankDetails?: {
        accountName?: string
        bankName?: string
      }
    }
  }

  return {
    accountName: extractMarketplaceAccountName(data),
    bankName: data.data?.bankDetails?.bankName?.trim() ?? "",
    reference: data.data?.id?.trim() ?? "",
  }
}

export async function verifyMarketplaceNin(input: {
  accessToken: string
  firstName: string
  lastName: string
  nin: string
}) {
  const response = await fetchWithTimeout(`${resolveMarketplaceRoutingBaseUrl()}/verify/identity/nin`, {
    method: "POST",
    headers: buildMarketplaceHeaders(input.accessToken, "application/json"),
    body: JSON.stringify({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      nin: input.nin.trim(),
    }),
  })

  if (!response.ok) {
    throw new ConvexError({
      code: "NIN_VERIFICATION_FAILED",
      message: "Unable to verify the NIN with Interswitch Marketplace.",
    })
  }

  const data = (await response.json()) as MarketplaceNinVerificationResponse & {
    data?: { id?: string }
  }
  const result = getMarketplaceNinVerificationResult(data)

  return {
    ...result,
    reference: data.data?.id?.trim() ?? "",
    raw: data,
  }
}
