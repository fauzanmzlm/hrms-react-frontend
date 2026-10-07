import {
  BriefcaseIcon,
  GavelIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigation } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth, useCurrentUser } from '@/features/auth/auth-context'
import type { Action } from '@/features/auth/permissions'
import type { User } from '@/lib/api/types'
import { ROLE_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  action?: Action
  visible?: (user: User) => boolean
}

interface NavGroup {
  /** Module names stay in Malay, as used across the organisation. */
  label?: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  { items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboardIcon, end: true }] },
  {
    label: 'Perkhidmatan',
    items: [
      { to: '/employees', label: 'Employees', icon: UsersIcon, action: 'employees.list' },
      { to: '/grades', label: 'Grades', icon: BriefcaseIcon, action: 'grades.view' },
      {
        to: '/me',
        label: 'My service record',
        icon: UserIcon,
        visible: (user) => user.role === 'EMPLOYEE' && user.employee_id !== undefined,
      },
    ],
  },
  {
    label: 'Naik Pangkat',
    items: [{ to: '/promotions', label: 'Promotion applications', icon: TrendingUpIcon }],
  },
  {
    label: 'Tatatertib',
    items: [{ to: '/disciplinary', label: 'Disciplinary cases', icon: GavelIcon }],
  },
  {
    label: 'Admin',
    items: [
      { to: '/admin/users/new', label: 'Create user', icon: UserPlusIcon, action: 'users.create' },
    ],
  },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth()
  const user = useCurrentUser()

  return (
    <nav aria-label="Main" className="flex flex-col gap-5 p-3">
      {NAV.map((group, index) => {
        const items = group.items.filter(
          (item) => (!item.action || can(item.action)) && (!item.visible || item.visible(user)),
        )
        if (items.length === 0) return null
        return (
          <div key={group.label ?? index}>
            {group.label && (
              <p className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted',
                        isActive && 'bg-muted font-medium text-foreground',
                      )
                    }
                  >
                    <item.icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-5 py-4">
      <ShieldCheckIcon className="size-5" aria-hidden="true" />
      <div className="leading-tight">
        <p className="text-sm font-semibold">HRMS</p>
        <p className="text-xs text-muted-foreground">Service &amp; Appraisal</p>
      </div>
    </div>
  )
}

function UserMenu() {
  const user = useCurrentUser()
  const { logout } = useAuth()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2" aria-label={`Account menu for ${user.username}`}>
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground uppercase">
            {user.username.slice(0, 1)}
          </span>
          <span className="hidden text-sm sm:inline">{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="font-medium">{user.username}</p>
          <p className="text-xs font-normal text-muted-foreground">{ROLE_LABELS[user.role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout('manual')}>
          <LogOutIcon aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useCurrentUser()
  const navigating = useNavigation().state === 'loading'

  return (
    <div className="flex min-h-svh">
      {navigating && (
        <div
          role="progressbar"
          aria-label="Loading page"
          className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-primary"
        />
      )}
      <a
        href="#main"
        className="sr-only z-50 rounded bg-background px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:block">
        <Brand />
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
              >
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <p className="text-sm text-muted-foreground">
            Signed in as{' '}
            <span className="font-medium text-foreground">{ROLE_LABELS[user.role]}</span>
          </p>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 p-4 outline-none md:p-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
