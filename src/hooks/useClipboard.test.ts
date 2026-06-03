import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useClipboard } from "./useClipboard"

// Mock toast to suppress UI noise
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ show: vi.fn() }),
}))

// Mock Tauri clipboard + audit APIs
vi.mock("@/lib/tauri", () => ({
  copyWithAudit: vi.fn(() => Promise.resolve()),
  clearClipboardIfMatches: vi.fn(() => Promise.resolve()),
}))

describe("useClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts with empty copiedText", () => {
    const { result } = renderHook(() => useClipboard())
    expect(result.current.copiedText).toBe("")
  })

  it("sets copiedText after copy and clears after 4s visual timeout", async () => {
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.copy({
        text: "sk-test-key",
        label: "API Key",
        targetId: "key-1",
      })
    })

    // Immediately after copy
    expect(result.current.copiedText).toBe("sk-test-key")

    // Advance past the 4s visual indicator clear
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    expect(result.current.copiedText).toBe("")
  })
})
