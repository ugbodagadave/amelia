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

import { BrandLogo } from "@/components/brand/BrandLogo"
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
    <div
      className={
        state === "collapsed"
          ? "flex h-12 items-center justify-center px-0"
          : "flex h-12 items-center px-3"
      }
    >
      {state === "collapsed" ? (
        <div className="flex size-8 items-center justify-center">
          <BrandLogo variant="mark" className="shrink-0" />
        </div>
      ) : (
        <BrandLogo variant="full" className="shrink-0" />
      )}
    </div>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { user } = useUser()

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    isActive:
      pathname === item.url ||
      (item.url === ROUTES.PATIENTS && pathname.startsWith(`${ROUTES.PATIENTS}/`)) ||
      (item.url === ROUTES.BILLS && pathname.startsWith("/bills/")),
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
