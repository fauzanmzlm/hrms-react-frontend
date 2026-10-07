import {
  ClipboardListIcon,
  GavelIcon,
  InfoIcon,
  PlusIcon,
  TrendingUpIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingState } from '@/components/states'
import { ServiceStatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DetailItem } from '@/components/DetailItem'
import { useAuth, useCurrentUser } from '@/features/auth/auth-context'
import { EmployeeCases } from '@/features/disciplinary/EmployeeCases'
import { useEmployee } from '@/features/employees/hooks'
import { GradeLabel } from '@/features/grades/GradeLabel'
import { EmployeePromotions } from '@/features/promotions/EmployeePromotions'
import type { User } from '@/lib/api/types'
import { formatDate } from '@/lib/dates'
import { ROLE_LABELS } from '@/lib/labels'
import { useCaseCount, useEmployeeCount, usePromotionCount } from './counts'
import { DirectoryPreview, PendingCasesQueue, PendingPromotionsQueue, StatCard } from './widgets'

export function DashboardPage() {
  const user = useCurrentUser()
  switch (user.role) {
    case 'EMPLOYEE':
      return <EmployeeDashboard user={user} />
    case 'APPROVER':
      return <ApproverDashboard user={user} />
    default:
      return <StaffDashboard user={user} />
  }
}

function Greeting({ user, actions }: { user: User; actions?: ReactNode }) {
  return (
    <PageHeader
      eyebrow={ROLE_LABELS[user.role]}
      title={`Welcome, ${user.username}`}
      description="Here is what needs your attention."
      actions={actions}
    />
  )
}

/** ADMIN and HR_OFFICER: headcount, review queues and the directory. */
function StaffDashboard({ user }: { user: User }) {
  const { can } = useAuth()
  const active = useEmployeeCount({ status: 'ACTIVE' })
  const total = useEmployeeCount()
  const pendingPromotions = usePromotionCount({ status: 'PENDING' })
  const pendingCases = useCaseCount({ status: 'PENDING' })

  return (
    <>
      <Greeting
        user={user}
        actions={
          <>
            {can('users.create') && (
              <Button asChild variant="outline">
                <Link to="/admin/users/new">
                  <UserPlusIcon aria-hidden="true" />
                  Create user
                </Link>
              </Button>
            )}
            {can('employees.write') && (
              <Button asChild>
                <Link to="/employees/new">
                  <PlusIcon aria-hidden="true" />
                  New employee
                </Link>
              </Button>
            )}
          </>
        }
      />
      <section aria-label="Summary" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active employees"
          icon={UsersIcon}
          to="/employees?status=ACTIVE"
          {...active}
        />
        <StatCard label="All employees" icon={ClipboardListIcon} to="/employees" {...total} />
        <StatCard
          label="Pending promotions"
          icon={TrendingUpIcon}
          to="/promotions?status=PENDING"
          {...pendingPromotions}
        />
        <StatCard
          label="Pending cases"
          icon={GavelIcon}
          to="/disciplinary?status=PENDING"
          {...pendingCases}
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <PendingPromotionsQueue />
        <PendingCasesQueue />
        <div className="xl:col-span-2">
          <DirectoryPreview />
        </div>
      </div>
    </>
  )
}

/** APPROVER: what is waiting for a decision. */
function ApproverDashboard({ user }: { user: User }) {
  const pendingPromotions = usePromotionCount({ status: 'PENDING' })
  const pendingCases = useCaseCount({ status: 'PENDING' })
  return (
    <>
      <Greeting user={user} />
      <section aria-label="Summary" className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Promotions to review"
          icon={TrendingUpIcon}
          to="/promotions?status=PENDING"
          {...pendingPromotions}
        />
        <StatCard
          label="Cases to review"
          icon={GavelIcon}
          to="/disciplinary?status=PENDING"
          {...pendingCases}
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <PendingPromotionsQueue title="Promotion applications to review" />
        <PendingCasesQueue title="Disciplinary cases to review" />
      </div>
    </>
  )
}

/** EMPLOYEE: their own record, applications and cases. */
function EmployeeDashboard({ user }: { user: User }) {
  const employee = useEmployee(user.employee_id)

  if (!user.employee_id) {
    return (
      <>
        <Greeting user={user} />
        <Alert className="max-w-2xl">
          <InfoIcon aria-hidden="true" />
          <AlertTitle>Your account is not linked to an employee record</AlertTitle>
          <AlertDescription>Ask an administrator to link your account.</AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={ROLE_LABELS[user.role]}
        title={employee.data ? `Welcome, ${employee.data.full_name}` : `Welcome, ${user.username}`}
        actions={
          employee.data?.service_status === 'ACTIVE' && (
            <Button asChild>
              <Link to="/promotions/new">
                <TrendingUpIcon aria-hidden="true" />
                Apply for promotion
              </Link>
            </Button>
          )
        }
      />
      {employee.isPending ? (
        <LoadingState rows={4} />
      ) : employee.isError ? (
        <ErrorState error={employee.error} onRetry={() => void employee.refetch()} />
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>My placement</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem label="Grade">
                  <GradeLabel id={employee.data.current_grade_id} withTitle />
                </DetailItem>
                <DetailItem label="Position">
                  {employee.data.position}, {employee.data.department}
                </DetailItem>
                <DetailItem label="Date joined">{formatDate(employee.data.date_joined)}</DetailItem>
                <DetailItem label="Service status">
                  <ServiceStatusBadge status={employee.data.service_status} />
                </DetailItem>
              </dl>
              <Link
                to={`/employees/${employee.data.id}`}
                className="mt-4 inline-block text-sm underline underline-offset-4"
              >
                View my full service record
              </Link>
            </CardContent>
          </Card>
          <div className="grid gap-6 xl:grid-cols-2">
            <EmployeePromotions employee={employee.data} />
            <EmployeeCases employee={employee.data} />
          </div>
        </div>
      )}
    </>
  )
}
