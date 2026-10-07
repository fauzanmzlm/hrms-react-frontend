import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { isApiError } from '@/lib/api/client'
import { applyApiErrorToForm, ROOT_SERVER_ERROR } from '@/lib/api/errors'
import { useAuth } from './auth-context'
import { safeRedirect } from './redirect'

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { user, login, logoutReason } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get('redirect'))

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  if (user) return <Navigate to={redirectTo} replace />

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values.username, values.password)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        form.setError(ROOT_SERVER_ERROR, {
          type: 'UNAUTHORIZED',
          message: 'Invalid username or password.',
        })
        form.setFocus('password')
        return
      }
      applyApiErrorToForm(error, form)
    }
  })

  const rootError = form.formState.errors.root?.server

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Sistem Pengurusan Sumber Manusia
          </p>
          <CardTitle>
            <h1 className="text-xl">Sign in to HRMS</h1>
          </CardTitle>
          <CardDescription>Use the account issued by your administrator.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate aria-label="Sign in">
            <FieldGroup>
              {logoutReason === 'expired' && !rootError && (
                <Alert>
                  <AlertDescription>
                    Your session has expired. Please sign in again.
                  </AlertDescription>
                </Alert>
              )}
              {rootError &&
                (rootError.type === 'UNAUTHORIZED' ? (
                  <Alert variant="destructive">
                    <AlertDescription>{rootError.message}</AlertDescription>
                  </Alert>
                ) : (
                  <FormRootError error={rootError} />
                ))}
              <TextField
                control={form.control}
                name="username"
                label="Username"
                autoComplete="username"
                required
              />
              <TextField
                control={form.control}
                name="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                required
              />
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
