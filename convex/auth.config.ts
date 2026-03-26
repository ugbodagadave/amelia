const clerkIssuerDomain =
  process.env.CLERK_JWT_ISSUER_DOMAIN ??
  process.env.CLERK_ISSUER_URL ??
  process.env.CLERK_FRONTEND_API_URL ??
  "https://placeholder.invalid"

export default {
  providers: [
    {
      domain: clerkIssuerDomain,
      applicationID: "convex",
    },
  ],
}
