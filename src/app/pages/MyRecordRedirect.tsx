import { Navigate } from 'react-router'
import { useCurrentUser } from '@/features/auth/auth-context'
import { ForbiddenPage } from './ForbiddenPage'

/** "/me" sends an EMPLOYEE to their own personnel record. */
export function MyRecordRedirect() {
  const user = useCurrentUser()
  if (user.employee_id === undefined) return <ForbiddenPage />
  return <Navigate to={`/employees/${user.employee_id}`} replace />
}
