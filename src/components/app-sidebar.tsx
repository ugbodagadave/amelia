import * as React from "react"
import { useLocation } from "react-router-dom"
import { useUser } from "@clerk/clerk-react"
import {
  SquaresFourIcon,
  UsersIcon,
  ReceiptIcon,
  FileTextIcon,
  ChartLineUpIcon,
  GearSixIcon,
} from "@phosphor-icons/react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { ROUTES } from "@/constants/routes"

const NAV_ITEMS = [
  { title: "Dashboard", url: ROUTES.DASHBOARD, icon: <SquaresFourIcon /> },
  { title: "Patients",  url: ROUTES.PATIENTS,  icon: <UsersIcon /> },
  { title: "Bills",     url: ROUTES.BILLS,      icon: <ReceiptIcon /> },
  { title: "Claims",    url: ROUTES.CLAIMS,     icon: <FileTextIcon /> },
  { title: "Analytics", url: ROUTES.ANALYTICS, icon: <ChartLineUpIcon /> },
  { title: "Settings",  url: ROUTES.SETTINGS,  icon: <GearSixIcon /> },
] as const

function SidebarLogo() {
  const { state } = useSidebar()
  return (
    <div className="flex h-12 items-center px-4">
      {state === "collapsed" ? (
        <span
          className="font-mono font-bold text-xl"
          style={{ color: "var(--primary)", fontFamily: "var(--font-mono)" }}
        >
          A
        </span>
      ) : (
        <span
          className="font-mono font-bold text-xl tracking-tight"
          style={{ color: "var(--primary)", fontFamily: "var(--font-mono)" }}
        >
          Amelia
        </span>
      )}
    </div>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { user } = useUser()

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }))

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : (user?.firstName?.[0] ?? "U").toUpperCase()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser
            user={{
              name: user.fullName ?? user.firstName ?? "User",
              email: user.primaryEmailAddress?.emailAddress ?? "",
              avatar: user.imageUrl ?? "",
              initials,
            }}
          />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
