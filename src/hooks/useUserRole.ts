import { useUser } from "@clerk/clerk-react"

export type UserRole = "admin" | "staff"

export function useUserRole(): UserRole | null {
  const { user } = useUser()
  return (user?.publicMetadata?.role as UserRole) ?? null
}

export function useIsAdmin(): boolean {
  return useUserRole() === "admin"
}
