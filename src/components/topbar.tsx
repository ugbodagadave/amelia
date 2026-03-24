import { useLocation } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MagnifyingGlassIcon, BellIcon, SunIcon, MoonIcon } from "@phosphor-icons/react"
import { useDarkMode } from "@/hooks/useDarkMode"
import { ROUTES } from "@/constants/routes"

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.ONBOARDING]: "Clinic Onboarding",
  [ROUTES.DASHBOARD]: "Dashboard",
  [ROUTES.PATIENTS]:  "Patients",
  [ROUTES.BILLS]:     "Bills",
  [ROUTES.BILLS_NEW]: "New Bill",
  [ROUTES.CLAIMS]:    "Claims",
  [ROUTES.ANALYTICS]: "Analytics",
  [ROUTES.SETTINGS]:  "Settings",
}

export function Topbar() {
  const { pathname } = useLocation()
  const { isDark, toggle } = useDarkMode()
  const title = pathname.startsWith(`${ROUTES.PATIENTS}/`)
    ? "Patient Profile"
    : (PAGE_TITLES[pathname] ?? "Amelia")

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-1 px-4">
        <div className="relative hidden sm:block">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="h-8 w-44 pl-8 text-sm"
          />
        </div>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <BellIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </Button>
      </div>
    </header>
  )
}
