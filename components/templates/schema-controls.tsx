"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, ColorSwatch } from "@/components/editor/primitives"
import { cn } from "@/lib/utils"

/**
 * One field's editing hint. Everything here is OPTIONAL — controls are inferred
 * from each value's runtime type and key name (see inferControl). A template
 * only needs to declare a field when the inference can't know something the
 * type alone doesn't carry: enum options, a slider's range, or a friendlier
 * label. The Zod schema still does the real work at save/render time
 * (validation); this drives the UI.
 */
export interface TemplateField {
  key: string
  label?: string
  control?: "text" | "textarea" | "color" | "slider" | "switch" | "select" | "lines"
  min?: number
  max?: number
  step?: number
  options?: string[]
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function inferControl(
  key: string,
  value: unknown,
  field?: TemplateField,
): NonNullable<TemplateField["control"]> {
  if (field?.control) return field.control
  if (field?.options) return "select"
  if (typeof value === "boolean") return "switch"
  if (typeof value === "number") return "slider"
  if (Array.isArray(value)) return "lines"
  if (typeof value === "string") {
    if (/colou?r/i.test(key) || HEX.test(value)) return "color"
    if (value.includes("\n") || /(text|tagline|subtitle|quote|body|byline)/i.test(key))
      return "textarea"
  }
  return "text"
}

const prettyLabel = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()

/**
 * Renders an editing panel for an arbitrary template's props object. Iterates
 * the value keys, infers a control per field, and emits a uniform onChange.
 * The same component edits every template — that's the point.
 */
export function SchemaControls({
  values,
  fields,
  onChange,
}: {
  values: Record<string, any>
  fields?: TemplateField[]
  onChange: (key: string, value: unknown) => void
}) {
  const fieldFor = (key: string) => fields?.find((f) => f.key === key)

  return (
    <div className="flex flex-col gap-5">
      {Object.entries(values).map(([key, value]) => {
        const meta = fieldFor(key)
        const control = inferControl(key, value, meta)
        const label = meta?.label || prettyLabel(key)

        if (control === "color") {
          return (
            <Field key={key} label={label}>
              <div className="flex items-center gap-2.5">
                <ColorSwatch color={String(value)} onChange={(v) => onChange(key, v)} />
                <Input
                  value={String(value)}
                  onChange={(e) => onChange(key, e.target.value)}
                  className="h-9 font-mono text-xs"
                />
              </div>
            </Field>
          )
        }

        if (control === "switch") {
          return (
            <Field key={key} label={label}>
              <button
                type="button"
                onClick={() => onChange(key, !value)}
                className={cn(
                  "inline-flex w-fit rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  value
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {value ? "On" : "Off"}
              </button>
            </Field>
          )
        }

        if (control === "slider") {
          const min = meta?.min ?? 0
          const max = meta?.max ?? 100
          const step = meta?.step ?? 1
          return (
            <Field key={key} label={label} value={Number(value)}>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={Number(value)}
                onChange={(e) => onChange(key, Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
              />
            </Field>
          )
        }

        if (control === "select") {
          const options = meta?.options ?? []
          return (
            <Field key={key} label={label}>
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(key, opt)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                      value === opt
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
          )
        }

        if (control === "lines") {
          const arr = Array.isArray(value) ? value : []
          return (
            <Field key={key} label={`${label} (one per line)`}>
              <Textarea
                value={arr.join("\n")}
                rows={Math.max(2, arr.length)}
                onChange={(e) =>
                  onChange(key, e.target.value.split("\n"))
                }
                className="resize-none text-sm"
              />
            </Field>
          )
        }

        if (control === "textarea") {
          return (
            <Field key={key} label={label}>
              <Textarea
                value={String(value)}
                rows={2}
                onChange={(e) => onChange(key, e.target.value)}
                className="resize-none text-sm"
              />
            </Field>
          )
        }

        // Default: single-line text.
        return (
          <Field key={key} label={label}>
            <Input
              value={String(value)}
              onChange={(e) => onChange(key, e.target.value)}
              className="h-9 text-sm"
            />
          </Field>
        )
      })}
    </div>
  )
}
