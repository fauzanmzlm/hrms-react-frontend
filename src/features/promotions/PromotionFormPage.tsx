import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangleIcon, InfoIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { SelectField, TextareaField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { useCurrentUser } from '@/features/auth/auth-context'
import { useCases } from '@/features/disciplinary/hooks'
import { EmployeeField } from '@/features/employees/EmployeeField'
import { useEmployee } from '@/features/employees/hooks'
import { gradeOptionGroups } from '@/features/grades/grade-options'
import { GradeLabel } from '@/features/grades/GradeLabel'
import { useGrades } from '@/features/grades/hooks'
import { applyApiErrorToForm } from '@/lib/api/errors'
import { formatDate } from '@/lib/dates'
import { SERVICE_STATUS_LABELS } from '@/lib/labels'
import { usePromotions, useSubmitPromotion } from './hooks'
import { promotionSchema, type PromotionFormValues } from './schema'

export function PromotionFormPage() {
  const user = useCurrentUser()
  const forSelf = user.role === 'EMPLOYEE'

  if (forSelf && !user.employee_id) {
    return (
      <>
        <PageHeader eyebrow="Naik Pangkat" title="Apply for promotion" />
        <Alert className="max-w-2xl">
          <InfoIcon aria-hidden="true" />
          <AlertTitle>Your account is not linked to an employee record</AlertTitle>
          <AlertDescription>Ask an administrator to link your account first.</AlertDescription>
        </Alert>
      </>
    )
  }
  return <PromotionForm forSelf={forSelf} ownEmployeeId={user.employee_id} />
}

function PromotionForm({ forSelf, ownEmployeeId }: { forSelf: boolean; ownEmployeeId?: number }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const grades = useGrades()
  const submit = useSubmitPromotion(forSelf)
  const schema = useMemo(() => promotionSchema(forSelf), [forSelf])
  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_id: forSelf ? String(ownEmployeeId ?? '') : (params.get('employee_id') ?? ''),
      proposed_grade_id: '',
      justification: '',
    },
  })
  const { control } = form

  const employeeId = Number(useWatch({ control, name: 'employee_id' })) || undefined
  const employee = useEmployee(employeeId)
  const pending = usePromotions(
    { employee_id: employeeId, status: 'PENDING', page_size: 1 },
    { enabled: employeeId !== undefined },
  )

  const currentGrade = grades.data?.find((g) => g.id === employee.data?.current_grade_id)
  // The backend requires a higher level; offering only those avoids a round trip.
  const higherGrades = currentGrade
    ? (grades.data ?? []).filter((g) => g.level > currentGrade.level)
    : []
  const approvedCases = useCases(
    { employee_id: employeeId, status: 'APPROVED', page_size: 1 },
    { enabled: employeeId !== undefined },
  )
  const notActive = employee.data && employee.data.service_status !== 'ACTIVE'
  const existingPending = pending.data?.items[0]
  const latestCase = approvedCases.data?.items[0]

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const app = await submit.mutateAsync(values)
      toast.success(`Promotion application #${app.id} submitted`)
      navigate(`/promotions/${app.id}`)
    } catch (error) {
      applyApiErrorToForm(error, form)
    }
  })

  return (
    <>
      <PageHeader
        eyebrow="Naik Pangkat"
        title={forSelf ? 'Apply for promotion' : 'New promotion application'}
        description="An approver reviews the application. If approved, the new grade takes effect on the date they set."
      />
      <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-6">
        <FormRootError error={form.formState.errors.root?.server} />

        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {!forSelf && (
                <EmployeeField
                  control={control}
                  name="employee_id"
                  required
                  onValueChange={() => form.setValue('proposed_grade_id', '')}
                />
              )}

              {employee.data && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Current grade: </span>
                    <GradeLabel id={employee.data.current_grade_id} withTitle />
                  </p>
                  <p>
                    <span className="text-muted-foreground">Position: </span>
                    {employee.data.position}, {employee.data.department}
                  </p>
                </div>
              )}

              {notActive && (
                <Alert variant="destructive">
                  <AlertTriangleIcon aria-hidden="true" />
                  <AlertTitle>Only active employees can apply</AlertTitle>
                  <AlertDescription>
                    {forSelf ? 'Your' : 'This employee’s'} service status is{' '}
                    {SERVICE_STATUS_LABELS[employee.data.service_status]}.
                  </AlertDescription>
                </Alert>
              )}
              {existingPending && (
                <Alert>
                  <InfoIcon aria-hidden="true" />
                  <AlertTitle>A pending application already exists</AlertTitle>
                  <AlertDescription>
                    <p>
                      Only one application can be pending at a time.{' '}
                      <Link
                        to={`/promotions/${existingPending.id}`}
                        className="font-medium underline underline-offset-4"
                      >
                        View application #{existingPending.id}
                      </Link>
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {latestCase && (
                <Alert>
                  <InfoIcon aria-hidden="true" />
                  <AlertTitle>Approved disciplinary case on record</AlertTitle>
                  <AlertDescription>
                    <p>
                      Case {latestCase.case_no} was approved on {formatDate(latestCase.reviewed_at)}
                      . A recent approved penalty blocks promotion for a period set by policy.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <SelectField
                control={control}
                name="proposed_grade_id"
                label="Proposed grade"
                options={gradeOptionGroups(higherGrades)}
                placeholder={
                  !employee.data
                    ? forSelf
                      ? 'Loading…'
                      : 'Choose an employee first'
                    : higherGrades.length === 0
                      ? 'No higher grade available'
                      : 'Select a grade'
                }
                description={
                  currentGrade
                    ? `Only grades above level ${currentGrade.level} (${currentGrade.code}) are listed.`
                    : undefined
                }
                disabled={!employee.data || higherGrades.length === 0}
                required
              />
              <TextareaField
                control={control}
                name="justification"
                label="Justification"
                description="Achievements, responsibilities and reasons for the promotion."
                rows={6}
                required
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Submitting…' : 'Submit application'}
          </Button>
          <Button asChild variant="outline">
            <Link to="/promotions">Cancel</Link>
          </Button>
        </div>
      </form>
    </>
  )
}
