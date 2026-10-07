import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppProviders } from './providers'
import { createQueryClient } from './query-client'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export function App() {
  const [queryClient] = useState(createQueryClient)
  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
      {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </AppProviders>
  )
}
