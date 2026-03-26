import { describe, expect, test, beforeEach } from "bun:test"
import { ROUTES } from "../src/constants/routes"
import {
  DARK_MODE_STORAGE_KEY,
  readDarkModePreference,
  applyDarkMode,
} from "../src/hooks/useDarkMode"

describe("Route constants", () => {
  test("all 6 app routes are defined", () => {
    expect(ROUTES.DASHBOARD).toBeDefined()
    expect(ROUTES.PATIENTS).toBeDefined()
    expect(ROUTES.BILLS).toBeDefined()
    expect(ROUTES.CLAIMS).toBeDefined()
    expect(ROUTES.ANALYTICS).toBeDefined()
    expect(ROUTES.SETTINGS).toBeDefined()
  })

  test("all app route values are unique", () => {
    const values = [
      ROUTES.DASHBOARD,
      ROUTES.PATIENTS,
      ROUTES.BILLS,
      ROUTES.CLAIMS,
      ROUTES.ANALYTICS,
      ROUTES.SETTINGS,
    ]
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  test("all app routes start with /", () => {
    const appRoutes = [
      ROUTES.DASHBOARD,
      ROUTES.PATIENTS,
      ROUTES.BILLS,
      ROUTES.CLAIMS,
      ROUTES.ANALYTICS,
      ROUTES.SETTINGS,
    ]
    for (const route of appRoutes) {
      expect(route).toMatch(/^\//)
    }
  })
})

describe("useDarkMode — persistence logic", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  test("DARK_MODE_STORAGE_KEY is defined", () => {
    expect(DARK_MODE_STORAGE_KEY).toBe("amelia-dark-mode")
  })

  test("applyDarkMode(true) adds .dark class and persists to localStorage", () => {
    applyDarkMode(true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem(DARK_MODE_STORAGE_KEY)).toBe("true")
  })

  test("applyDarkMode(false) removes .dark class and persists to localStorage", () => {
    document.documentElement.classList.add("dark")
    applyDarkMode(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(localStorage.getItem(DARK_MODE_STORAGE_KEY)).toBe("false")
  })

  test("readDarkModePreference returns true when localStorage has 'true'", () => {
    localStorage.setItem(DARK_MODE_STORAGE_KEY, "true")
    expect(readDarkModePreference()).toBe(true)
  })

  test("readDarkModePreference returns false when localStorage has 'false'", () => {
    localStorage.setItem(DARK_MODE_STORAGE_KEY, "false")
    expect(readDarkModePreference()).toBe(false)
  })

  test("readDarkModePreference returns false when no preference stored (no matchMedia in happy-dom)", () => {
    expect(readDarkModePreference()).toBe(false)
  })
})

test("AppLayout does not use a synthetic sidebar resize bridge", async () => {
  const source = await Bun.file("./src/layouts/AppLayout.tsx").text()
  expect(source).not.toContain("SidebarResizeBridge")
  expect(source).not.toContain("requestAnimationFrame")
  expect(source).not.toContain("window.dispatchEvent(new Event(\"resize\"))")
})

test("sidebar uses a fixed desktop width and no resize persistence", async () => {
  const source = await Bun.file("./src/components/ui/sidebar.tsx").text()
  expect(source).toContain('const SIDEBAR_WIDTH = "16rem"')
  expect(source).not.toContain("SIDEBAR_WIDTH_STORAGE_KEY")
  expect(source).not.toContain("sidebarWidthPx")
  expect(source).not.toContain("localStorage.setItem")
})

test("ChartContainer debounces responsive resize work", async () => {
  const source = await Bun.file("./src/components/ui/chart.tsx").text()
  expect(source).toContain("const CHART_RESIZE_DEBOUNCE_MS = 120")
  expect(source).toContain("debounce={CHART_RESIZE_DEBOUNCE_MS}")
})

test("App uses lazy route loading with Suspense for heavier pages", async () => {
  const source = await Bun.file("./src/App.tsx").text()
  expect(source).toContain('import { Suspense, lazy')
  expect(source).toContain("const DashboardPage = lazy(")
  expect(source).toContain("<Suspense")
  expect(source).not.toContain('import { DashboardPage } from "@/pages/Dashboard"')
  expect(source).not.toContain('import { ClaimsPage } from "@/pages/Claims"')
})

test("vite build defines manual chunks and disables compressed-size reporting", async () => {
  const source = await Bun.file("./vite.config.ts").text()
  expect(source).toContain("reportCompressedSize: false")
  expect(source).toContain("manualChunks(id)")
  expect(source).toContain("framework")
  expect(source).toContain("auth-data")
  expect(source).toContain("charts")
  expect(source).toContain("claims-ui")
  expect(source).toContain("ui-vendor")
})

test("ChartContainer uses named recharts imports instead of a namespace import", async () => {
  const source = await Bun.file("./src/components/ui/chart.tsx").text()
  expect(source).not.toContain('import * as RechartsPrimitive from "recharts"')
  expect(source).toContain('import {')
  expect(source).toContain('from "recharts"')
  expect(source).toContain("<ResponsiveContainer")
})
