import { useCallback, useRef, useState } from "react"

// ── types ────────────────────────────────────────────────────────────────

export interface ValidationRule {
  rule: (value: unknown) => boolean
  message: string
}

export type ValidationRules<T> = Partial<Record<keyof T, readonly ValidationRule[]>>

// ── built-in validators ─────────────────────────────────────────────────

export function required(msg = "Required"): ValidationRule {
  return {
    rule(v): boolean {
      if (v === null || v === undefined) return false
      if (typeof v === "string") return v.trim().length > 0
      return true
    },
    message: msg,
  }
}

export function minLength(n: number, msg?: string): ValidationRule {
  return {
    rule(v): boolean {
      if (v === null || v === undefined) return true
      if (typeof v === "string") return v.trim().length >= n
      return true
    },
    message: msg ?? `Must be at least ${n} characters`,
  }
}

export function maxLength(n: number, msg?: string): ValidationRule {
  return {
    rule(v): boolean {
      if (v === null || v === undefined) return true
      if (typeof v === "string") return v.trim().length <= n
      return true
    },
    message: msg ?? `Must be at most ${n} characters`,
  }
}

export function pattern(regex: RegExp, msg: string): ValidationRule {
  return {
    rule(v): boolean {
      if (v === null || v === undefined) return true
      if (typeof v === "string" && v.length === 0) return true
      return regex.test(String(v))
    },
    message: msg,
  }
}

// ── inline error component ──────────────────────────────────────────────

export function InlineError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-[10px] text-rose-400 mt-0.5">{error}</p>
}

// ── hook ────────────────────────────────────────────────────────────────

export function useFormValidation<T>(rules: ValidationRules<T>) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})

  // Always use the latest rules so conditional rules (e.g. edit vs create) work.
  const rulesRef = useRef(rules)
  rulesRef.current = rules

  const validateField = useCallback((field: keyof T, data: T) => {
    const fieldRules = rulesRef.current[field]
    if (!fieldRules) return

    const value = data[field]
    const failed = fieldRules.find((r) => !r.rule(value))
    setErrors((prev) => {
      const next = { ...prev }
      if (failed) {
        next[field] = failed.message
      } else {
        delete next[field]
      }
      return next
    })
  }, [])

  const validate = useCallback(
    (data: T): boolean => {
      const newErrors: Partial<Record<keyof T, string>> = {}
      for (const field of Object.keys(rulesRef.current) as (keyof T)[]) {
        const fieldRules = rulesRef.current[field]!
        const value = data[field]
        const failed = fieldRules.find((r) => !r.rule(value))
        if (failed) {
          newErrors[field] = failed.message
        }
      }
      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    },
    [],
  )

  const clearErrors = useCallback(() => setErrors({}), [])

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  return { errors, validate, validateField, clearErrors, clearFieldError }
}
