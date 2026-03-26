import { Fragment, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "convex/react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  BellIcon,
  CheckIcon,
  SunIcon,
  MoonIcon,
  HouseIcon,
  ReceiptIcon,
  PlusIcon,
  FileTextIcon,
  UsersIcon,
  UserCircleIcon,
  ChartLineUpIcon,
  GearSixIcon,
  CreditCardIcon,
  FilesIcon,
} from "@phosphor-icons/react"
import { api } from "../../convex/_generated/api"
import { useDarkMode } from "@/hooks/useDarkMode"
import { ROUTES } from "@/constants/routes"
import { buildNotificationTimestampLabel, NOTIFICATION_TYPE } from "@/lib/notifications"

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

function getNotificationIcon(type: string) {
  switch (type) {
    case NOTIFICATION_TYPE.PAYMENT_CONFIRMED:
    case NOTIFICATION_TYPE.PAYMENT_REQUEST_SENT:
    case NOTIFICATION_TYPE.PAYMENT_REQUEST_FAILED:
      return <CreditCardIcon />
    case NOTIFICATION_TYPE.CLAIM_BATCH_GENERATED:
    case NOTIFICATION_TYPE.CLAIM_BATCH_SUBMITTED:
    case NOTIFICATION_TYPE.CLAIM_BATCH_PAID:
    case NOTIFICATION_TYPE.CLAIM_BATCH_OVERDUE:
      return <FilesIcon />
    case NOTIFICATION_TYPE.AUTH_CONFIRMED:
      return <CheckIcon />
    default:
      return <BellIcon />
  }
}

export function Topbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isDark, toggle } = useDarkMode()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const patientId = pathname.startsWith("/patients/") ? pathname.split("/")[2] ?? null : null
  const patient = useQuery(
    api.patients.getById,
    patientId ? { patientId: patientId as never } : "skip",
  )
  const notifications = useQuery(api.notifications.getRecentNotifications) ?? []
  const unreadNotificationCount = useQuery(api.notifications.getUnreadNotificationCount) ?? 0
  const markNotificationRead = useMutation(api.notifications.markNotificationRead)
  const markAllNotificationsRead = useMutation(api.notifications.markAllNotificationsRead)
  const title = pathname === ROUTES.BILLS_NEW
    ? PAGE_TITLES[ROUTES.BILLS_NEW]
    : pathname.startsWith(`${ROUTES.PATIENTS}/`)
      ? patient?.fullName ?? "Patient Profile"
      : pathname.startsWith("/bills/")
        ? "Bill Detail"
        : (PAGE_TITLES[pathname] ?? "Amelia")

  const home = { label: "Home", to: ROUTES.DASHBOARD, icon: <HouseIcon /> }

  const breadcrumbs =
    pathname === ROUTES.BILLS_NEW
      ? [home, { label: "Bills", to: ROUTES.BILLS, icon: <ReceiptIcon /> }, { label: "New Bill", icon: <PlusIcon /> }]
      : pathname.startsWith("/bills/") && pathname !== ROUTES.BILLS
        ? [home, { label: "Bills", to: ROUTES.BILLS, icon: <ReceiptIcon /> }, { label: "Bill Detail", icon: <FileTextIcon /> }]
        : pathname.startsWith("/patients/") && pathname !== ROUTES.PATIENTS
          ? [home, { label: "Patients", to: ROUTES.PATIENTS, icon: <UsersIcon /> }, { label: patient?.fullName ?? "Patient Profile", icon: <UserCircleIcon /> }]
          : pathname === ROUTES.PATIENTS
            ? [home, { label: "Patients", icon: <UsersIcon /> }]
            : pathname === ROUTES.BILLS
              ? [home, { label: "Bills", icon: <ReceiptIcon /> }]
              : pathname === ROUTES.CLAIMS
                ? [home, { label: "Claims", icon: <FileTextIcon /> }]
                : pathname === ROUTES.ANALYTICS
                  ? [home, { label: "Analytics", icon: <ChartLineUpIcon /> }]
                  : pathname === ROUTES.SETTINGS
                    ? [home, { label: "Settings", icon: <GearSixIcon /> }]
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
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <BellIcon data-icon="inline-start" />
              {unreadNotificationCount > 0 ? (
                <Badge
                  className="absolute -top-1 -right-1 px-1.5"
                  style={{
                    minHeight: "var(--notification-badge-min-size)",
                    minWidth: "var(--notification-badge-min-size)",
                  }}
                >
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="gap-3 p-0"
            style={{
              width: "var(--notification-panel-width)",
              maxHeight: "var(--notification-panel-max-height)",
            }}
          >
            <PopoverHeader className="gap-2 border-b px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <PopoverTitle>Notifications</PopoverTitle>
                  <PopoverDescription>
                    {unreadNotificationCount > 0
                      ? `${unreadNotificationCount} unread recent activit${unreadNotificationCount === 1 ? "y" : "ies"}`
                      : "Recent activity across patients, billing, payments, and claims."}
                  </PopoverDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={unreadNotificationCount === 0}
                  onClick={() => void markAllNotificationsRead()}
                >
                  Mark all read
                </Button>
              </div>
            </PopoverHeader>
            {notifications.length === 0 ? (
              <Empty className="border-0 p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BellIcon />
                  </EmptyMedia>
                  <EmptyTitle>No notifications yet</EmptyTitle>
                  <EmptyDescription>
                    New activity from bills, payments, claims, and patients will appear here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ScrollArea className="min-h-0">
                <div className="flex flex-col">
                  {notifications.map((notification, index) => (
                    <Fragment key={notification._id}>
                      <button
                        type="button"
                        className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60"
                        onClick={async () => {
                          if (!notification.isRead) {
                            await markNotificationRead({ notificationId: notification._id })
                          }
                          setNotificationsOpen(false)
                          navigate(notification.route)
                        }}
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center bg-muted text-foreground">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-medium">{notification.title}</span>
                              {!notification.isRead ? (
                                <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                              ) : null}
                            </div>
                            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                              {buildNotificationTimestampLabel(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs/relaxed text-muted-foreground">
                            {notification.description}
                          </p>
                        </div>
                      </button>
                      {index < notifications.length - 1 ? <Separator /> : null}
                    </Fragment>
                  ))}
                </div>
              </ScrollArea>
            )}
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <SunIcon data-icon="inline-start" /> : <MoonIcon data-icon="inline-start" />}
        </Button>
      </div>
    </header>
  )
}
