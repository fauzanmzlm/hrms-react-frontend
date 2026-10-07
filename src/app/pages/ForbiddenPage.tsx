import { LockIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <LockIcon className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Your role does not have permission to open this page.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  )
}
