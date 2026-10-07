import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

/** Last-resort boundary for errors thrown while rendering a route. */
export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  return (
    <main role="alert" className="flex min-h-svh flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">{message}</p>
      <Button onClick={() => window.location.assign('/')}>Reload the app</Button>
    </main>
  )
}
