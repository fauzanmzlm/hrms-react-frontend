import {
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

/** The Go API, called directly (no browser, so no CORS) to seed test data. */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1'
export const ADMIN = {
  username: process.env.E2E_ADMIN_USERNAME ?? 'admin',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe-2026',
}
export const PASSWORD = 'E2e-Passw0rd!'

/** A short suffix that keeps generated codes unique across runs. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36).slice(-5)}${Math.floor(Math.random() * 36 ** 2).toString(36)}`.toUpperCase()
}

/** A unique, valid 12-digit MyKad number (YYMMDD + 6 digits). */
export function uniqueIc(): string {
  const n = String(Date.now() % 1_000_000).padStart(6, '0')
  return `900101${n}`
}

type Json = Record<string, unknown>

export class Api {
  private readonly ctx: APIRequestContext
  private readonly token: string

  private constructor(ctx: APIRequestContext, token: string) {
    this.ctx = ctx
    this.token = token
  }

  static async login(username = ADMIN.username, password = ADMIN.password): Promise<Api> {
    const ctx = await playwrightRequest.newContext()
    const res = await ctx.post(`${API_URL}/auth/login`, { data: { username, password } })
    expect(res.status(), `login as ${username}`).toBe(200)
    const body = (await res.json()) as { data: { access_token: string } }
    return new Api(ctx, body.data.access_token)
  }

  async call<T = Json>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, data?: Json) {
    const res = await this.ctx.fetch(`${API_URL}${path}`, {
      method,
      data,
      headers: { Authorization: `Bearer ${this.token}` },
    })
    const body = res.status() === 204 ? null : ((await res.json()) as { data?: T; error?: Json })
    return { status: res.status(), data: body?.data as T, error: body?.error }
  }

  async create<T = Json>(path: string, data: Json): Promise<T> {
    const res = await this.call<T>('POST', path, data)
    expect(res.status, `POST ${path}: ${JSON.stringify(res.error)}`).toBe(201)
    return res.data
  }
}

export interface Seeded {
  suffix: string
  gradeLow: { id: number; code: string }
  gradeHigh: { id: number; code: string }
  employee: { id: number; full_name: string; employee_no: string }
}

/** Two grades and an employee with a current service record. */
export async function seedEmployee(api: Api, suffix = uniqueSuffix()): Promise<Seeded> {
  const gradeLow = await api.create<{ id: number; code: string }>('/grades', {
    code: `L${suffix}`.slice(0, 10),
    scheme: 'E2E',
    level: 41,
    title: 'E2E Officer',
  })
  const gradeHigh = await api.create<{ id: number; code: string }>('/grades', {
    code: `H${suffix}`.slice(0, 10),
    scheme: 'E2E',
    level: 44,
    title: 'E2E Senior Officer',
  })
  const employee = await api.create<{ id: number; full_name: string; employee_no: string }>(
    '/employees',
    {
      employee_no: `E2E-${suffix}`,
      ic_number: uniqueIc(),
      full_name: `E2E Staff ${suffix}`,
      email: `e2e.${suffix.toLowerCase()}@example.gov.my`,
      phone: '0123456789',
      date_of_birth: '1990-01-01',
      gender: 'FEMALE',
      current_grade_id: gradeLow.id,
      position: 'Officer',
      department: 'E2E Department',
      service_status: 'ACTIVE',
      date_joined: '2015-01-01',
      confirmed_at: null,
    },
  )
  await api.create(`/employees/${employee.id}/service-records`, {
    grade_id: gradeLow.id,
    position: 'Officer',
    department: 'E2E Department',
    appointment_type: 'PERMANENT',
    effective_from: '2015-01-01',
    effective_to: null,
    remarks: 'Initial appointment',
  })
  return { suffix, gradeLow, gradeHigh, employee }
}

export async function createUser(
  api: Api,
  role: 'ADMIN' | 'HR_OFFICER' | 'APPROVER' | 'EMPLOYEE',
  suffix: string,
  employeeId?: number,
): Promise<{ id: number; username: string }> {
  return api.create('/users', {
    username: `${role.toLowerCase().replace('_', '')}_${suffix.toLowerCase()}`,
    password: PASSWORD,
    role,
    ...(employeeId ? { employee_id: employeeId } : {}),
  })
}

/** A sidebar link; dashboards repeat some names as tiles and quick actions. */
export function navLink(page: Page, name: string) {
  return page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true })
}

export async function signIn(page: Page, username: string, password = PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: `Account menu for ${username}` })).toBeVisible()
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: /Account menu for/ }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to HRMS' })).toBeVisible()
}
