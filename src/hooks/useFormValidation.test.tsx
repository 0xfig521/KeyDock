import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useFormValidation, required, pattern, minLength } from "./useFormValidation"

describe("built-in validators", () => {
  describe("required", () => {
    const r = required("Required")

    it("rejects null", () => expect(r.rule(null)).toBe(false))
    it("rejects undefined", () => expect(r.rule(undefined)).toBe(false))
    it("rejects empty string", () => expect(r.rule("")).toBe(false))
    it("rejects whitespace-only", () => expect(r.rule("   ")).toBe(false))
    it("accepts non-empty string", () => expect(r.rule("hello")).toBe(true))
    it("accepts numbers", () => expect(r.rule(0)).toBe(true))
  })

  describe("pattern", () => {
    const p = pattern(/^[A-Z_]+$/, "Must be UPPERCASE")

    it("accepts UPPERCASE", () => expect(p.rule("OPENAI_API_KEY")).toBe(true))
    it("rejects lowercase", () => expect(p.rule("openai")).toBe(false))
    it("accepts empty string (optional)", () => expect(p.rule("")).toBe(true))
    it("rejects mixed case", () => expect(p.rule("OpenAI")).toBe(false))
  })

  describe("minLength", () => {
    const m = minLength(3, "Too short")

    it("accepts long enough", () => expect(m.rule("hello")).toBe(true))
    it("rejects too short", () => expect(m.rule("ab")).toBe(false))
    it("accepts null (no rule)", () => expect(m.rule(null)).toBe(true))
    it("accepts undefined (no rule)", () => expect(m.rule(undefined)).toBe(true))
  })
})

describe("useFormValidation", () => {
  it("starts with no errors", () => {
    const { result } = renderHook(() => useFormValidation({}))
    expect(result.current.errors).toEqual({})
  })

  it("returns validate() = false and sets errors on failure", () => {
    const { result } = renderHook(() =>
      useFormValidation({
        name: [required("Name is required")],
        key: [pattern(/^[A-Z]+$/, "Must be uppercase")],
      }),
    )

    let valid: boolean
    act(() => {
      valid = result.current.validate({ name: "", key: "abc" })
    })

    expect(valid!).toBe(false)
    expect(result.current.errors.name).toBe("Name is required")
    expect(result.current.errors.key).toBe("Must be uppercase")
  })

  it("returns validate() = true when all pass", () => {
    const { result } = renderHook(() =>
      useFormValidation({
        name: [required()],
        key: [pattern(/^[A-Z]+$/, "Must be uppercase")],
      }),
    )

    let valid: boolean
    act(() => {
      valid = result.current.validate({ name: "hello", key: "ABC" })
    })

    expect(valid!).toBe(true)
    expect(result.current.errors).toEqual({})
  })

  it("clearErrors resets all errors", () => {
    const { result } = renderHook(() =>
      useFormValidation({
        name: [required()],
      }),
    )

    act(() => result.current.validate({ name: "" }))
    expect(result.current.errors.name).toBeDefined()

    act(() => result.current.clearErrors())
    expect(result.current.errors).toEqual({})
  })

  it("clearFieldError removes single field error", () => {
    const { result } = renderHook(() =>
      useFormValidation({
        a: [required()],
        b: [required()],
      }),
    )

    act(() => result.current.validate({ a: "", b: "" }))
    expect(result.current.errors.a).toBeDefined()
    expect(result.current.errors.b).toBeDefined()

    act(() => result.current.clearFieldError("a"))
    expect(result.current.errors.a).toBeUndefined()
    expect(result.current.errors.b).toBeDefined()
  })

  it("validateField validates a single field", () => {
    const { result } = renderHook(() =>
      useFormValidation({
        name: [required()],
      }),
    )

    act(() => result.current.validateField("name", { name: "" }))
    expect(result.current.errors.name).toBeDefined()

    act(() => result.current.validateField("name", { name: "ok" }))
    expect(result.current.errors.name).toBeUndefined()
  })
})
