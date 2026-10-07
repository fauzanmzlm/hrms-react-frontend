import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { SelectField, TextareaField, TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { EmployeeField } from '@/features/employees/EmployeeField'
import { applyApiErrorToForm } from '@/lib/api/errors'
import { OFFENSE_CATEGORIES } from '@/lib/api/types'
import { todayIsoDate } from '@/lib/dates'
import { OFFENSE_CATEGORY_LABELS, PENALTY_LABELS } from '@/lib/labels'
import { useCreateCase } from './hooks'
import { caseSchema, penaltiesFor, type CaseFormValues } from './schema'

const categoryOptions = OFFENSE_CATEGORIES.map((c) => ({
  value: c,
  label:
    c === 'SERIOUS' ? 'Serious (may lead to demotion or dismissal)' : OFFENSE_CATEGORY_LABELS[c],
}))

export function CaseFormPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const create = useCreateCase()
  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      employee_id: params.get('employee_id') ?? '',
      case_no: '',
      category: '',
      description: '',
      incident_date: '',
      penalty: '',
    },
  })
  const { control } = form
  const category = useWatch({ control, name: 'category' })
  const penaltyOptions = penaltiesFor(category).map((p) => ({ value: p, label: PENALTY_LABELS[p] }))

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const record = await create.mutateAsync(values)
      toast.success(`Case ${record.case_no} opened`)
      navigate(`/disciplinary/${record.id}`)
    } catch (error) {
      applyApiErrorToForm(error, form)
    }
  })

  return (
    <>
      <PageHeader
        eyebrow="Tatatertib"
        title="Open disciplinary case"
        description="The case stays pending until an approver confirms or rejects the proposed penalty. You cannot review a case you reported."
      />
      <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-6">
        <FormRootError error={form.formState.errors.root?.server} />
        <Card>
          <CardHeader>
            <CardTitle>Case details</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <EmployeeField control={control} name="employee_id" required />
              </div>
              <TextField
                control={control}
                name="case_no"
                label="Case number"
                placeholder="TT-2026-001"
                description="Must be unique."
                required
              />
              <TextField
                control={control}
                name="incident_date"
                label="Incident date"
                type="date"
                max={todayIsoDate()}
                required
              />
              <SelectField
                control={control}
                name="category"
                label="Category"
                options={categoryOptions}
                placeholder="Select a category"
                onValueChange={(next) => {
                  const penalty = form.getValues('penalty')
                  if (penalty && !penaltiesFor(next).some((p) => p === penalty)) {
                    form.setValue('penalty', '')
                  }
                }}
                required
              />
              <SelectField
                control={control}
                name="penalty"
                label="Proposed penalty"
                options={penaltyOptions}
                placeholder={category ? 'Select a penalty' : 'Choose a category first'}
                description="Demotion and dismissal are only available for serious cases."
                disabled={!category}
                required
              />
              <TextareaField
                control={control}
                name="description"
                label="Description"
                description="What happened, and the evidence."
                rows={5}
                required
                className="md:col-span-2"
              />
            </FieldGroup>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Opening…' : 'Open case'}
          </Button>
          <Button asChild variant="outline">
            <Link to="/disciplinary">Cancel</Link>
          </Button>
        </div>
      </form>
    </>
  )
}
