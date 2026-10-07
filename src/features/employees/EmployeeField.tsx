import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { FieldShell } from '@/components/form/fields'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useGradeMap } from '@/features/grades/hooks'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { SERVICE_STATUS_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { useEmployee, useEmployees } from './hooks'

interface EmployeeComboboxProps {
  id: string
  /** Employee id as a string ("" when nothing is selected). */
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
}

/** Searchable employee picker backed by GET /employees?search=. */
export function EmployeeCombobox({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  disabled,
}: EmployeeComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 250)
  const selectedId = value ? Number(value) : undefined
  const selected = useEmployee(selectedId)
  const grades = useGradeMap()
  const results = useEmployees(
    { search: debouncedSearch || undefined, page_size: 10 },
    { enabled: open },
  )
  const listId = `${id}-list`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selectedId && 'text-muted-foreground')}>
            {selected.data
              ? `${selected.data.full_name} (${selected.data.employee_no})`
              : selectedId
                ? `Employee #${selectedId}`
                : 'Select an employee'}
          </span>
          <ChevronsUpDownIcon className="opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search name, employee no. or IC…"
            value={search}
            onValueChange={setSearch}
            aria-label="Search employees"
          />
          <CommandList id={listId}>
            {results.isFetching && !results.data && (
              <p className="p-3 text-sm text-muted-foreground">Searching…</p>
            )}
            {results.isError && (
              <p className="p-3 text-sm text-destructive">Could not load employees.</p>
            )}
            <CommandEmpty>No employees found.</CommandEmpty>
            <CommandGroup>
              {results.data?.items.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={String(employee.id)}
                  onSelect={() => {
                    onChange(String(employee.id))
                    setOpen(false)
                  }}
                >
                  <CheckIcon
                    className={cn(String(employee.id) === value ? 'opacity-100' : 'opacity-0')}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate">{employee.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {employee.employee_no} · {grades.get(employee.current_grade_id)?.code ?? '—'}{' '}
                      · {SERVICE_STATUS_LABELS[employee.service_status]}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface EmployeeFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label?: string
  description?: ReactNode
  required?: boolean
  disabled?: boolean
  /** Called after the selection changes, e.g. to reset dependent fields. */
  onValueChange?: (value: string) => void
}

export function EmployeeField<T extends FieldValues>({
  control,
  name,
  label = 'Employee',
  description,
  required,
  disabled,
  onValueChange,
}: EmployeeFieldProps<T>) {
  const id = useId()
  const {
    field: { value, onChange },
    fieldState,
  } = useController({ control, name })
  const error = fieldState.error?.message
  const describedBy =
    [description ? `${id}-description` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <FieldShell id={id} label={label} description={description} error={error} required={required}>
      <EmployeeCombobox
        id={id}
        value={(value as string | undefined) ?? ''}
        onChange={(next) => {
          onChange(next)
          onValueChange?.(next)
        }}
        invalid={Boolean(error)}
        describedBy={describedBy}
        disabled={disabled}
      />
    </FieldShell>
  )
}
