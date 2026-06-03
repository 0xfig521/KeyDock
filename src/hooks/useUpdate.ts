import { useCallback, useEffect, useState } from "react"
import { check } from "@tauri-apps/plugin-updater"

export interface UpdateInfo {
  /** True when a newer version is available */
  available: boolean
  /** The new version string (semver) */
  version?: string
  /** Release notes / body */
  body?: string
  /** True while downloading the update */
  downloading: boolean
  /** Download progress (0-1), undefined until first progress event */
  progress?: number
  /** Human-readable status message */
  status: "idle" | "checking" | "available" | "downloading" | "installing" | "done" | "error"
}

export function useUpdate() {
  const [update, setUpdate] = useState<UpdateInfo>({
    available: false,
    downloading: false,
    status: "idle",
  })

  const checkForUpdates = useCallback(async () => {
    setUpdate((prev) => ({ ...prev, status: "checking" }))
    try {
      const result = await check()
      if (result?.available) {
        setUpdate({
          available: true,
          version: result.version,
          body: result.body,
          downloading: false,
          status: "available",
        })
      } else {
        setUpdate({
          available: false,
          downloading: false,
          status: "idle",
        })
      }
    } catch {
      setUpdate((prev) => ({ ...prev, status: "idle" }))
    }
  }, [])

  const installUpdate = useCallback(async () => {
    try {
      const result = await check()
      if (!result?.available) return

      setUpdate((prev) => ({ ...prev, status: "downloading", downloading: true }))

      await result.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started": {
            const total = event.data.contentLength ?? 0
            if (total > 0) setUpdate((prev) => ({ ...prev, progress: 0 }))
            break
          }
          case "Progress":
            break
          case "Finished":
            setUpdate((prev) => ({ ...prev, progress: 1 }))
            break
        }
      })

      setUpdate((prev) => ({ ...prev, status: "installing", downloading: false }))
    } catch {
      setUpdate((prev) => ({
        ...prev,
        downloading: false,
        status: "error",
      }))
    }
  }, [])

  // Check for updates once on mount (with a short delay so the UI loads first)
  useEffect(() => {
    const timer = setTimeout(checkForUpdates, 5000)
    return () => clearTimeout(timer)
  }, [checkForUpdates])

  return { update, checkForUpdates, installUpdate }
}
