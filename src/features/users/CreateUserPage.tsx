import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2Icon } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { SelectField, TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { optionsFromLabels } from '@/components/form/options'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { EmployeeField } from '@/features/employees/EmployeeField'
import { applyApiErrorToForm } from '@/lib/api/errors'
import { ROLES, type User } from '@/lib/api/types'
import { ROLE_LABELS } from '@/lib/labels'
import { usersApi } from './api'
import { userSchema, type UserFormValues } from './schema'

const roleOptions = optionsFromLabels(ROLES, ROLE_LABELS)

const DEFAULTS: UserFormValues = {
  username: '',
  password: '',
  confirm_password: '',
  role: '',
  employee_id: '',
}

export function CreateUserPage() {
  const [created, setCreated] = useState<User | null>(null)
  const create = useMutation({ mutationFn: usersApi.create })
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: DEFAULTS,
  })
  const { control } = form
  const role = useWatch({ control, name: 'role' })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await create.mutateAsync(values)
      toast.success(`User ${user.username} created`)
      setCreated(user)
      form.reset(DEFAULTS)
    } catch (error) {
      applyApiErrorToForm(error, form)
    }
  })

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Create user"
        description="Create a login account. Users cannot be listed or edited from the API, so note the details before leaving this page."
      />
      <div className="flex max-w-2xl flex-col gap-6">
        {created && (
          <Alert>
            <CheckCircle2Icon aria-hidden="true" />
            <AlertTitle>User {created.username} created</AlertTitle>
            <AlertDescription>
              <p>
                {ROLE_LABELS[created.role]} account, user #{created.id}
                {created.employee_id ? `, linked to employee #${created.employee_id}` : ''}. Share
                the password with them securely.
              </p>
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} noValidate aria-label="Create user">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Usernames are unique. Passwords need 8–72 characters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <FormRootError error={form.formState.errors.root?.server} />
                <TextField
                  control={control}
                  name="username"
                  label="Username"
                  autoComplete="off"
                  required
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    control={control}
                    name="password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                  <TextField
                    control={control}
                    name="confirm_password"
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <SelectField
                  control={control}
                  name="role"
                  label="Role"
                  options={roleOptions}
                  placeholder="Select a role"
                  required
                />
                <EmployeeField
                  control={control}
                  name="employee_id"
                  label={role === 'EMPLOYEE' ? 'Employee record' : 'Employee record (optional)'}
                  description={
                    role === 'EMPLOYEE'
                      ? 'The employee can only see this record and their own applications and cases.'
                      : 'Link staff who are also employees so they cannot review their own applications or cases.'
                  }
                  required={role === 'EMPLOYEE'}
                />
                <div>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Creating…' : 'Create user'}
                  </Button>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </form>
      </div>
    </>
  )
}
