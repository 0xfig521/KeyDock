import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Input } from "./input"
import { Textarea } from "./textarea"

describe("Input IME composition", () => {
  it("does not swallow changes while composing", () => {
    const onChange = vi.fn()

    render(<Input aria-label="name" onChange={onChange} />)

    const input = screen.getByLabelText("name")
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: "ni" } })
    fireEvent.compositionEnd(input)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(input).toHaveValue("ni")
  })
})

describe("Textarea IME composition", () => {
  it("does not swallow changes while composing", () => {
    const onChange = vi.fn()

    render(<Textarea aria-label="description" onChange={onChange} />)

    const textarea = screen.getByLabelText("description")
    fireEvent.compositionStart(textarea)
    fireEvent.change(textarea, { target: { value: "ni" } })
    fireEvent.compositionEnd(textarea)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(textarea).toHaveValue("ni")
  })
})
