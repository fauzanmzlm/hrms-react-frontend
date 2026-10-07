import { AlertCircleIcon, BanIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const TITLES: Record<string, string> = {
  RULE_VIOLATION: 'Not allowed by policy',
  CONFLICT: 'Conflict',
  INVALID_STATUS_TRANSITION: 'Already reviewed',
  FORBIDDEN: 'Not permitted',
  NOT_FOUND: 'Not found',
  VALIDATION_FAILED: 'Please check the form',
  BAD_REQUEST: 'Invalid request',
  NETWORK_ERROR: 'Connection problem',
}

/** Shows the form-level error set by applyApiErrorToForm (errors.root.server). */
export function FormRootError({ error }: { error?: { type?: string | number; message?: string } }) {
  if (!error?.message) return null
  const code = typeof error.type === 'string' ? error.type : ''
  const Icon = code === 'RULE_VIOLATION' || code === 'FORBIDDEN' ? BanIcon : AlertCircleIcon
  return (
    <Alert variant="destructive">
      <Icon aria-hidden="true" />
      <AlertTitle>{TITLES[code] ?? 'Could not complete the request'}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )
}
