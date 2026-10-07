import { useId, type ReactNode } from 'react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import type { SelectOption, SelectOptionGroup } from './options'

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  description?: ReactNode
  required?: boolean
  disabled?: boolean
  className?: string
}

interface ShellProps {
  id: string
  label: string
  description?: ReactNode
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

function describedBy(id: string, description: unknown, error: unknown): string | undefined {
  const ids = [description ? `${id}-description` : null, error ? `${id}-error` : null]
  return ids.filter(Boolean).join(' ') || undefined
}

/** Label, description and error message wired to the control via ids. */
export function FieldShell({
  id,
  label,
  description,
  error,
  required,
  className,
  children,
}: ShellProps) {
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      {children}
      {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}

interface TextFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  type?: 'text' | 'email' | 'password' | 'tel' | 'date' | 'number'
  autoComplete?: string
  placeholder?: string
  inputMode?: 'numeric' | 'text' | 'email' | 'tel'
  min?: string | number
  max?: string | number
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  type = 'text',
  ...inputProps
}: TextFieldProps<T>) {
  const id = useId()
  const {
    field: { ref, value, onChange, onBlur },
    fieldState,
  } = useController({ control, name })
  const error = fieldState.error?.message
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <Input
        {...inputProps}
        id={id}
        type={type}
        name={name}
        ref={ref}
        value={(value as string | number | undefined) ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, description, error)}
      />
    </FieldShell>
  )
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  rows = 4,
  placeholder,
}: BaseFieldProps<T> & { rows?: number; placeholder?: string }) {
  const id = useId()
  const {
    field: { ref, value, onChange, onBlur },
    fieldState,
  } = useController({ control, name })
  const error = fieldState.error?.message
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <Textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        name={name}
        ref={ref}
        value={(value as string | undefined) ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, description, error)}
      />
    </FieldShell>
  )
}

interface SelectFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: Array<SelectOption | SelectOptionGroup>
  placeholder?: string
  /** Called after the form value changes, e.g. to reset dependent fields. */
  onValueChange?: (value: string) => void
}

function isGroup(option: SelectOption | SelectOptionGroup): option is SelectOptionGroup {
  return 'options' in option
}

/** A native <select>: fully keyboard accessible and works with screen readers. */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  options,
  placeholder = 'Select…',
  onValueChange,
}: SelectFieldProps<T>) {
  const id = useId()
  const {
    field: { ref, value, onChange, onBlur },
    fieldState,
  } = useController({ control, name })
  const error = fieldState.error?.message
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <NativeSelect
        className="w-full"
        id={id}
        name={name}
        ref={ref}
        value={(value as string | undefined) ?? ''}
        onChange={(event) => {
          onChange(event.target.value)
          onValueChange?.(event.target.value)
        }}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, description, error)}
      >
        <NativeSelectOption value="">{placeholder}</NativeSelectOption>
        {options.map((option) =>
          isGroup(option) ? (
            <optgroup key={option.label} label={option.label}>
              {option.options.map((o) => (
                <NativeSelectOption key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </optgroup>
          ) : (
            <NativeSelectOption key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </NativeSelectOption>
          ),
        )}
      </NativeSelect>
    </FieldShell>
  )
}
