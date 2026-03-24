import { Fragment } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  MagnifyingGlassIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  HouseIcon,
  ReceiptIcon,
  PlusIcon,
  FileTextIcon,
} from "@phosphor-icons/react"
import { useDarkMode } from "@/hooks/useDarkMode"
import { ROUTES } from "@/constants/routes"

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.ONBOARDING]: "Clinic Onboarding",
  [ROUTES.DASHBOARD]: "Dashboard",
  [ROUTES.PATIENTS]:  "Patients",
  [ROUTES.BILLS]:     "Bills",
  [ROUTES.BILLS_NEW]: "New Bill",
  [ROUTES.BILL_DETAIL]: "Bill Detail",
  [ROUTES.CLAIMS]:    "Claims",
  [ROUTES.ANALYTICS]: "Analytics",
  [ROUTES.SETTINGS]:  "Settings",
}

export function Topbar() {
  const { pathname } = useLocation()
  const { isDark, toggle } = useDarkMode()
  const title = pathname === ROUTES.BILLS_NEW
    ? PAGE_TITLES[ROUTES.BILLS_NEW]
    : pathname.startsWith(`${ROUTES.PATIENTS}/`)
      ? "Patient Profile"
      : pathname.startsWith("/bills/")
        ? "Bill Detail"
        : (PAGE_TITLES[pathname] ?? "Amelia")

  const breadcrumbs =
    pathname === ROUTES.BILLS_NEW
      ? [
          {
            label: "Home",
            to: ROUTES.DASHBOARD,
            icon: <HouseIcon />,
          },
          {
            label: "Bills",
            to: ROUTES.BILLS,
            icon: <ReceiptIcon />,
          },
          {
            label: "New Bill",
            icon: <PlusIcon />,
          },
        ]
      : pathname.startsWith("/bills/") && pathname !== ROUTES.BILLS
        ? [
            {
              label: "Home",
              to: ROUTES.DASHBOARD,
              icon: <HouseIcon />,
            },
            {
              label: "Bills",
              to: ROUTES.BILLS,
              icon: <ReceiptIcon />,
            },
            {
              label: "Bill Detail",
              icon: <FileTextIcon />,
            },
          ]
        : null

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
            {breadcrumbs ? (
              breadcrumbs.map((crumb, index) => (
                <Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem>
                    {crumb.to ? (
                      <BreadcrumbLink asChild>
                        <Link className="inline-flex items-center gap-1.5" to={crumb.to}>
                          {crumb.icon}
                          <span>{crumb.label}</span>
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="inline-flex items-center gap-1.5 font-medium">
                        {crumb.icon}
                        <span>{crumb.label}</span>
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
                </Fragment>
              ))
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">{title}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
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
