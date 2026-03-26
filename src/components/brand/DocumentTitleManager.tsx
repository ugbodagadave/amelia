import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { getDocumentTitleForPath } from "@/lib/branding"

export function DocumentTitleManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = getDocumentTitleForPath(pathname)
  }, [pathname])

  return null
}
