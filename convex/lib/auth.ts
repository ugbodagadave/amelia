import { ConvexError } from "convex/values"
import type { MutationCtx, QueryCtx } from "../_generated/server"

type AuthenticatedCtx = MutationCtx | QueryCtx

export async function requireClerkUserId(ctx: AuthenticatedCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource.",
    })
  }

  return identity.subject
}
