import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { SelectField, TextareaField, TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { optionsFromLabels } from '@/components/form/options'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { gradeOptionGroups } from '@/features/grades/grade-options'
import { useGrades } from '@/features/grades/hooks'
import { applyApiErrorToForm } from '@/lib/api/errors'
import { APPOINTMENT_TYPES, type Employee, type ServiceRecord } from '@/lib/api/types'
import { formatDate } from '@/lib/dates'
import { APPOINTMENT_TYPE_LABELS } from '@/lib/labels'
import { toServiceRecordFormValues } from './api'
import { useCreateServiceRecord, useUpdateServiceRecord } from './hooks'
import { serviceRecordSchema, type ServiceRecordFormValues } from './schema'

interface ServiceRecordFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee
  /** Edits this record; adds a new one when undefined. */
  record?: ServiceRecord
  /** The employee's current record, used for the date hint when adding. */
  current?: ServiceRecord
}

export function ServiceRecordFormDialog({
  open,
  onOpenChange,
  ...props
}: ServiceRecordFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && <ServiceRecordForm {...props} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

const appointmentOptions = optionsFromLabels(APPOINTMENT_TYPES, APPOINTMENT_TYPE_LABELS)

function ServiceRecordForm({
  employee,
  record,
  current,
  onDone,
}: Omit<ServiceRecordFormDialogProps, 'open' | 'onOpenChange'> & { onDone: () => void }) {
  const grades = useGrades()
  const create = useCreateServiceRecord(employee.id)
  const update = useUpdateServiceRecord(employee.id, record?.id ?? 0)
  const form = useForm<ServiceRecordFormValues>({
    resolver: zodResolver(serviceRecordSchema),
    defaultValues: toServiceRecordFormValues(record, employee),
  })
  const { control } = form

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (record) await update.mutateAsync(values)
      else await create.mutateAsync(values)
      toast.success(record ? 'Service record updated' : 'Service record added')
      onDone()
    } catch (error) {
      applyApiErrorToForm(error, form)
    }
  })

  const startHint =
    !record && current
      ? `For a new current record, start after ${formatDate(current.effective_from)}. The previous record closes the day before.`
      : undefined

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>{record ? 'Edit service record' : 'Add service record'}</DialogTitle>
        <DialogDescription>{employee.full_name}</DialogDescription>
      </DialogHeader>
      <FieldGroup className="my-4">
        <FormRootError error={form.formState.errors.root?.server} />
        <SelectField
          control={control}
          name="grade_id"
          label="Grade"
          options={gradeOptionGroups(grades.data ?? [])}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField control={control} name="position" label="Position" required />
          <TextField control={control} name="department" label="Department" required />
        </div>
        <SelectField
          control={control}
          name="appointment_type"
          label="Appointment type"
          options={appointmentOptions}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={control}
            name="effective_from"
            label="Effective from"
            type="date"
            description={startHint}
            required
          />
          <TextField
            control={control}
            name="effective_to"
            label="Effective to"
            type="date"
            description="Leave empty for the current record."
          />
        </div>
        <TextareaField control={control} name="remarks" label="Remarks" rows={2} />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : 'Save record'}
        </Button>
      </DialogFooter>
    </form>
  )
}
