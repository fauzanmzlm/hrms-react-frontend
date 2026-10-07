import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { useIdParam } from '@/hooks/use-id-param'
import { SelectField, TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { optionsFromLabels } from '@/components/form/options'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { gradeOptionGroups } from '@/features/grades/grade-options'
import { GradeLabel } from '@/features/grades/GradeLabel'
import { useGrades } from '@/features/grades/hooks'
import { applyApiErrorToForm } from '@/lib/api/errors'
import { GENDERS, SERVICE_STATUSES, type Employee } from '@/lib/api/types'
import { todayIsoDate } from '@/lib/dates'
import { GENDER_LABELS, SERVICE_STATUS_LABELS } from '@/lib/labels'
import { toEmployeeFormValues } from './api'
import { useCreateEmployee, useEmployee, useUpdateEmployee } from './hooks'
import { employeeSchema, type EmployeeFormValues } from './schema'

export function EmployeeCreatePage() {
  return <EmployeeForm mode="create" />
}

export function EmployeeEditPage() {
  const id = useIdParam('employeeId') ?? 0
  const employee = useEmployee(id)
  if (!id) return <NotFoundPage />
  if (employee.isPending) return <LoadingState rows={8} />
  if (employee.isError)
    return <ErrorState error={employee.error} onRetry={() => void employee.refetch()} />
  return <EmployeeForm mode="edit" employee={employee.data} />
}

const genderOptions = optionsFromLabels(GENDERS, GENDER_LABELS)
const statusOptions = optionsFromLabels(SERVICE_STATUSES, SERVICE_STATUS_LABELS)

function EmployeeForm({ mode, employee }: { mode: 'create' | 'edit'; employee?: Employee }) {
  const navigate = useNavigate()
  const grades = useGrades()
  const create = useCreateEmployee()
  const update = useUpdateEmployee(employee?.id ?? 0)
  const schema = useMemo(() => employeeSchema(mode), [mode])
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toEmployeeFormValues(employee),
  })
  const { control } = form
  const today = todayIsoDate()

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved =
        mode === 'create' ? await create.mutateAsync(values) : await update.mutateAsync(values)
      toast.success(mode === 'create' ? `${saved.full_name} added` : 'Changes saved')
      navigate(`/employees/${saved.id}`)
    } catch (error) {
      applyApiErrorToForm(error, form)
    }
  })

  const cancelTo = employee ? `/employees/${employee.id}` : '/employees'

  return (
    <>
      <PageHeader
        eyebrow="Perkhidmatan"
        title={mode === 'create' ? 'New employee' : `Edit ${employee?.full_name ?? 'employee'}`}
        description={
          mode === 'create'
            ? 'After saving, add the first service record to start the service history.'
            : undefined
        }
      />
      <form onSubmit={onSubmit} noValidate className="flex max-w-4xl flex-col gap-6">
        <FormRootError error={form.formState.errors.root?.server} />

        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <TextField control={control} name="employee_no" label="Employee number" required />
              <TextField
                control={control}
                name="ic_number"
                label="IC number (MyKad)"
                placeholder="900101-14-5678"
                inputMode="numeric"
                description="12 digits; dashes are optional."
                required
              />
              <TextField
                control={control}
                name="full_name"
                label="Full name"
                autoComplete="off"
                required
                className="md:col-span-2"
              />
              <SelectField
                control={control}
                name="gender"
                label="Gender"
                options={genderOptions}
                required
              />
              <TextField
                control={control}
                name="date_of_birth"
                label="Date of birth"
                type="date"
                max={today}
                required
              />
              <TextField control={control} name="email" label="Email" type="email" required />
              <TextField control={control} name="phone" label="Phone" type="tel" />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placement</CardTitle>
            {mode === 'edit' && (
              <CardDescription>
                The grade changes only through service records and approved promotions.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              {mode === 'create' ? (
                <SelectField
                  control={control}
                  name="current_grade_id"
                  label="Starting grade"
                  options={gradeOptionGroups(grades.data ?? [])}
                  placeholder={grades.isPending ? 'Loading grades…' : 'Select a grade'}
                  required
                />
              ) : (
                <div className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Current grade</span>
                  <GradeLabel id={employee?.current_grade_id} withTitle />
                </div>
              )}
              <SelectField
                control={control}
                name="service_status"
                label="Service status"
                options={statusOptions}
                required
              />
              <TextField control={control} name="position" label="Position" required />
              <TextField control={control} name="department" label="Department" required />
              <TextField
                control={control}
                name="date_joined"
                label="Date joined"
                type="date"
                required
              />
              <TextField
                control={control}
                name="confirmed_at"
                label="Confirmed in service"
                type="date"
                description="Leave empty if not yet confirmed."
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? 'Saving…'
              : mode === 'create'
                ? 'Create employee'
                : 'Save changes'}
          </Button>
          <Button asChild variant="outline">
            <Link to={cancelTo}>Cancel</Link>
          </Button>
        </div>
      </form>
    </>
  )
}
