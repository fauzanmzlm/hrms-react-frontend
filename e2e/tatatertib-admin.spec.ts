import { expect, test } from '@playwright/test'
import {
  ADMIN,
  Api,
  createUser,
  PASSWORD,
  seedEmployee,
  signIn,
  signOut,
  uniqueSuffix,
  navLink,
} from './support'

test.describe('Tatatertib', () => {
  test('HR opens a case, the reporter cannot review it, an approver approves', async ({ page }) => {
    const api = await Api.login()
    const suffix = uniqueSuffix()
    const seeded = await seedEmployee(api, suffix)
    const hr = await createUser(api, 'HR_OFFICER', suffix)
    const approver = await createUser(api, 'APPROVER', suffix)
    const caseNo = `TT-${suffix}`

    // A case number that already exists, for the 409.
    await api.create('/disciplinary-records', {
      employee_id: seeded.employee.id,
      case_no: `${caseNo}-DUP`,
      category: 'MINOR',
      description: 'Seeded duplicate.',
      incident_date: '2026-01-15',
      penalty: 'WARNING',
    })

    await signIn(page, hr.username)
    await page.goto(`/employees/${seeded.employee.id}`)
    await page.getByRole('link', { name: 'Open case' }).click()
    await expect(page.getByRole('heading', { name: 'Open disciplinary case' })).toBeVisible()
    await page.getByLabel('Case number').fill(`${caseNo}-DUP`)
    await page.getByLabel('Incident date').fill('2026-08-01')
    await page.getByLabel('Category').selectOption('MINOR')
    // Demotion and dismissal are not offered for MINOR cases.
    await expect(
      page.getByLabel('Proposed penalty').locator('option[value="DISMISSAL"]'),
    ).toHaveCount(0)
    await page.getByLabel('Proposed penalty').selectOption('FINE')
    await page.getByRole('textbox', { name: 'Description' }).fill('Repeated late attendance.')
    await page.getByRole('button', { name: 'Open case' }).click()
    await expect(page.getByText('Case number already exists')).toBeVisible()
    await expect(page.getByLabel('Case number')).toBeFocused()

    await page.getByLabel('Case number').fill(caseNo)
    await page.getByRole('button', { name: 'Open case' }).click()
    await expect(page.getByRole('heading', { name: `Case ${caseNo}` })).toBeVisible()
    await expect(page.getByText('Waiting for an approver to review this case.')).toBeVisible()
    const caseId = Number(/\/disciplinary\/(\d+)/.exec(page.url())?.[1])

    // 403: HR cannot review at all (role), checked against the API directly.
    const hrApi = await Api.login(hr.username, PASSWORD)
    expect(
      (
        await hrApi.call('POST', `/disciplinary-records/${caseId}/review`, {
          status: 'APPROVED',
          remarks: '',
        })
      ).status,
    ).toBe(403)
    // 422: the backend also rejects DEMOTION on a MINOR case.
    const demotion = await hrApi.call('POST', '/disciplinary-records', {
      employee_id: seeded.employee.id,
      case_no: `${caseNo}-X`,
      category: 'MINOR',
      description: 'x',
      incident_date: '2026-01-01',
      penalty: 'DEMOTION',
    })
    expect(demotion.status).toBe(422)
    expect(demotion.error?.fields).toMatchObject({ penalty: 'is only allowed for SERIOUS cases' })
    await signOut(page)

    // Approver approves; a second review is a 409.
    await signIn(page, approver.username)
    await navLink(page, 'Disciplinary cases').click()
    await page.getByLabel('Status').selectOption('PENDING')
    await page.getByRole('link', { name: caseNo, exact: true }).click()
    await page.getByRole('radio', { name: 'Approve' }).check()
    await page.getByRole('button', { name: 'Submit review' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Approve' }).click()
    await expect(page.getByText('Penalty imposed')).toBeVisible()
    const approverApi = await Api.login(approver.username, PASSWORD)
    const again = await approverApi.call('POST', `/disciplinary-records/${caseId}/review`, {
      status: 'REJECTED',
      remarks: 'Changed my mind',
    })
    expect(again.status).toBe(409)
    expect(again.error?.code).toBe('INVALID_STATUS_TRANSITION')
  })

  test('an ADMIN who reported a case is blocked from reviewing it', async ({ page }) => {
    const api = await Api.login()
    const seeded = await seedEmployee(api)
    const record = await api.create<{ id: number }>('/disciplinary-records', {
      employee_id: seeded.employee.id,
      case_no: `TT-${seeded.suffix}`,
      category: 'SERIOUS',
      description: 'Misuse of office equipment.',
      incident_date: '2026-02-01',
      penalty: 'DISMISSAL',
    })
    await signIn(page, ADMIN.username, ADMIN.password)
    await page.goto(`/disciplinary/${record.id}`)
    await expect(
      page.getByText('You reported this case. Another approver must review it.'),
    ).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Approve' })).toHaveCount(0)
    const res = await api.call('POST', `/disciplinary-records/${record.id}/review`, {
      status: 'REJECTED',
      remarks: 'Self review',
    })
    expect(res.status).toBe(403)
  })
})

test.describe('Admin', () => {
  test('creates users, with conflicts shown on the right fields', async ({ page }) => {
    const api = await Api.login()
    const suffix = uniqueSuffix()
    const seeded = await seedEmployee(api, suffix)
    const existing = await createUser(api, 'EMPLOYEE', `${suffix}A`, seeded.employee.id)
    const free = await seedEmployee(api)
    const username = `staff_${suffix.toLowerCase()}`

    await signIn(page, ADMIN.username, ADMIN.password)
    await navLink(page, 'Create user').click()
    await expect(page.getByRole('heading', { name: 'Create user' })).toBeVisible()

    const fill = async (name: string) => {
      await page.getByLabel('Username').fill(name)
      await page.getByLabel(/^Password/).fill(PASSWORD)
      await page.getByLabel('Confirm password').fill(PASSWORD)
      await page.getByLabel('Role').selectOption('EMPLOYEE')
    }
    const pickEmployee = async (search: string, name: string) => {
      await page.getByRole('combobox', { name: /Employee record/ }).click()
      await page.getByPlaceholder('Search name, employee no. or IC…').fill(search)
      await page.getByRole('option', { name: new RegExp(name) }).click()
    }

    // Client-side: EMPLOYEE needs a linked record.
    await fill(username)
    await page.getByRole('button', { name: 'Create user' }).click()
    await expect(
      page.getByText('Employee accounts must be linked to an employee record'),
    ).toBeVisible()

    // 409: that employee already has an account.
    await pickEmployee(seeded.employee.employee_no, seeded.employee.full_name)
    await page.getByRole('button', { name: 'Create user' }).click()
    await expect(page.getByText('Employee already has a user account')).toBeVisible()

    // 409: duplicate username.
    await page.getByLabel('Username').fill(existing.username)
    await pickEmployee(free.employee.employee_no, free.employee.full_name)
    await page.getByRole('button', { name: 'Create user' }).click()
    await expect(page.getByText('Username already exists')).toBeVisible()
    await expect(page.getByLabel('Username')).toBeFocused()

    // 422: password too short (server rule mirrored on the client).
    await page.getByLabel('Username').fill(username)
    await page.getByLabel(/^Password/).fill('short')
    await page.getByLabel('Confirm password').fill('short')
    await page.getByRole('button', { name: 'Create user' }).click()
    await expect(page.getByText('At least 8 characters')).toBeVisible()

    await page.getByLabel(/^Password/).fill(PASSWORD)
    await page.getByLabel('Confirm password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Create user' }).click()
    await expect(
      page.getByText(
        new RegExp(`Employee account, user #\\d+, linked to employee #${free.employee.id}`),
      ),
    ).toBeVisible()
    await signOut(page)

    // The new account works and sees its own record.
    await signIn(page, username)
    await navLink(page, 'My service record').click()
    await expect(page.getByRole('heading', { name: free.employee.full_name })).toBeVisible()
  })
})
