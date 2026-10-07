import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { isApiError } from './client'

// Domain sentinel errors are wrapped by the backend as "<sentinel>: <detail>".
const SENTINEL_PREFIXES = [
  'resource not found: ',
  'resource already exists: ',
  'invalid input: ',
  'unauthorized: ',
  'forbidden: ',
  'invalid status transition: ',
  'business rule violation: ',
]

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** A human-readable message for any error, without backend sentinel prefixes. */
export function errorMessage(error: unknown): string {
  if (!isApiError(error)) {
    return error instanceof Error ? error.message : 'Something went wrong.'
  }
  if (error.status >= 500) return 'Something went wrong on the server. Please try again.'
  let message = error.message
  const prefix = SENTINEL_PREFIXES.find((p) => message.startsWith(p))
  if (prefix) message = message.slice(prefix.length)
  return capitalize(message)
}

/** Turns a field message such as "is required" into "This field is required". */
export function fieldMessage(message: string): string {
  const readable = message.replace(/_/g, ' ')
  return readable.startsWith('is ') ? `This field ${readable}` : capitalize(readable)
}

export function errorReference(error: unknown): string | undefined {
  return isApiError(error) && error.status >= 500 ? error.requestId : undefined
}

/** Shows a toast for an error that is not tied to a form. */
export function toastError(error: unknown, title?: string): void {
  const reference = errorReference(error)
  const message = errorMessage(error)
  toast.error(title ?? message, {
    description: [title ? message : null, reference ? `Reference: ${reference}` : null]
      .filter(Boolean)
      .join(' · '),
  })
}

export const ROOT_SERVER_ERROR = 'root.server' as const

/**
 * Unique-key conflicts (409) carry no field name, only a fixed message per
 * index (internal/repository/mysql/*.go in the backend).
 */
const CONFLICT_FIELDS: ReadonlyArray<[RegExp, string]> = [
  [/grade code already exists/i, 'code'],
  [/employee number already exists/i, 'employee_no'],
  [/IC number already exists/i, 'ic_number'],
  [/email already exists/i, 'email'],
  [/case number already exists/i, 'case_no'],
  [/username already exists/i, 'username'],
  [/employee already has a user account/i, 'employee_id'],
]

function conflictField(error: unknown): string | undefined {
  if (!isApiError(error) || error.status !== 409) return undefined
  return CONFLICT_FIELDS.find(([pattern]) => pattern.test(error.message))?.[1]
}

/**
 * Applies an API error to a react-hook-form form. Field errors whose names
 * match form fields, and known unique-key conflicts, are set on those fields
 * (and the first one is focused); everything else becomes a form-level
 * `root.server` error, rendered by <FormRootError>. Returns true if any field
 * error was applied.
 */
export function applyApiErrorToForm<T extends FieldValues>(
  error: unknown,
  form: UseFormReturn<T>,
  fieldMap: Partial<Record<string, Path<T>>> = {},
): boolean {
  const values = form.getValues() as Record<string, unknown>
  const unmatched: string[] = []
  let first: Path<T> | undefined

  if (isApiError(error) && error.fields) {
    for (const [field, message] of Object.entries(error.fields)) {
      const name = fieldMap[field] ?? (field in values ? (field as Path<T>) : undefined)
      if (name) {
        form.setError(name, { type: 'server', message: fieldMessage(message) })
        first ??= name
      } else {
        unmatched.push(`${field.replace(/_/g, ' ')}: ${message}`)
      }
    }
  }

  const conflict = conflictField(error)
  if (conflict && conflict in values) {
    first = conflict as Path<T>
    form.setError(first, { type: 'server', message: errorMessage(error) })
  }

  if (first) {
    form.setFocus(first)
  }
  if (!first || unmatched.length > 0) {
    const reference = errorReference(error)
    const parts = [unmatched.length > 0 ? unmatched.join('; ') : errorMessage(error)]
    if (reference) parts.push(`Reference: ${reference}`)
    form.setError(ROOT_SERVER_ERROR as Path<T>, {
      type: isApiError(error) ? error.code : 'unknown',
      message: parts.join(' · '),
    })
  }
  return first !== undefined
}
