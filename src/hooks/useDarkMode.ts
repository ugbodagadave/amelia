import { useState, useCallback } from "react"

export const DARK_MODE_STORAGE_KEY = "amelia-dark-mode"

export function readDarkModePreference(): boolean {
  const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
  if (stored === "true") return true
  if (stored === "false") return false
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }
  return false
}

export function applyDarkMode(isDark: boolean): void {
  document.documentElement.classList.toggle("dark", isDark)
  localStorage.setItem(DARK_MODE_STORAGE_KEY, String(isDark))
}

export function useDarkMode(): { isDark: boolean; toggle: () => void } {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const pref = readDarkModePreference()
    applyDarkMode(pref)
    return pref
  })

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      applyDarkMode(!prev)
      return !prev
    })
  }, [])

  return { isDark, toggle }
}
