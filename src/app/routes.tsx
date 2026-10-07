import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'
import { LoadingState } from '@/components/states'
import { RequireAuth, RequirePermission } from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AppShell } from './AppShell'
import { MyRecordRedirect } from './pages/MyRecordRedirect'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteErrorPage } from './pages/RouteErrorPage'

/** Loads a page component on first visit, so each feature is its own chunk. */
function page<M>(load: () => Promise<M>, pick: (module: M) => ComponentType) {
  return async () => ({ Component: pick(await load()) })
}

const employees = () => import('@/features/employees/pages')
const promotions = () => import('@/features/promotions/pages')
const disciplinary = () => import('@/features/disciplinary/pages')

/*
 * Role checks here mirror the backend's role middleware so users cannot reach
 * screens they are not allowed to use, even by typing the URL. Record-level
 * rules (an EMPLOYEE may only read their own records) are enforced by the
 * backend and shown as a 403 error state.
 */
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <LoadingState rows={6} />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'me', element: <MyRecordRedirect /> },

          // Perkhidmatan
          {
            element: <RequirePermission action="employees.list" />,
            children: [{ path: 'employees', lazy: page(employees, (m) => m.EmployeeListPage) }],
          },
          {
            element: <RequirePermission action="employees.write" />,
            children: [
              { path: 'employees/new', lazy: page(employees, (m) => m.EmployeeCreatePage) },
              {
                path: 'employees/:employeeId/edit',
                lazy: page(employees, (m) => m.EmployeeEditPage),
              },
            ],
          },
          {
            path: 'employees/:employeeId',
            lazy: page(employees, (m) => m.EmployeeDetailPage),
          },
          {
            element: <RequirePermission action="grades.view" />,
            children: [
              {
                path: 'grades',
                lazy: page(
                  () => import('@/features/grades/GradesPage'),
                  (m) => m.GradesPage,
                ),
              },
            ],
          },

          // Naik Pangkat
          { path: 'promotions', lazy: page(promotions, (m) => m.PromotionListPage) },
          {
            element: <RequirePermission action="promotions.submit" />,
            children: [
              { path: 'promotions/new', lazy: page(promotions, (m) => m.PromotionFormPage) },
            ],
          },
          {
            path: 'promotions/:promotionId',
            lazy: page(promotions, (m) => m.PromotionDetailPage),
          },

          // Tatatertib
          { path: 'disciplinary', lazy: page(disciplinary, (m) => m.CaseListPage) },
          {
            element: <RequirePermission action="disciplinary.create" />,
            children: [
              { path: 'disciplinary/new', lazy: page(disciplinary, (m) => m.CaseFormPage) },
            ],
          },
          {
            path: 'disciplinary/:caseId',
            lazy: page(disciplinary, (m) => m.CaseDetailPage),
          },

          // Admin
          {
            element: <RequirePermission action="users.create" />,
            children: [
              {
                path: 'admin/users/new',
                lazy: page(
                  () => import('@/features/users/CreateUserPage'),
                  (m) => m.CreateUserPage,
                ),
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
