import { expect, test } from '@playwright/test'
import { Api, createUser, seedEmployee, signIn, signOut, uniqueSuffix, navLink } from './support'

test.describe('Naik Pangkat', () => {
  test('EMPLOYEE applies, APPROVER approves, the grade and history update', async ({ page }) => {
    const api = await Api.login()
    const suffix = uniqueSuffix()
    const seeded = await seedEmployee(api, suffix)
    const other = await seedEmployee(api)
    const staff = await createUser(api, 'EMPLOYEE', suffix, seeded.employee.id)
    const approver = await createUser(api, 'APPROVER', suffix)
    const otherApp = await api.create<{ id: number }>('/promotions', {
      employee_id: other.employee.id,
      proposed_grade_id: other.gradeHigh.id,
      justification: 'Seeded for the 403 check.',
    })

    // EMPLOYEE submits for themselves.
    await signIn(page, staff.username)
    await navLink(page, 'Promotion applications').click()
    await page.getByRole('link', { name: 'Apply for promotion' }).click()
    await expect(page.getByRole('combobox', { name: /Employee/ })).toHaveCount(0)
    const grade = page.getByLabel('Proposed grade')
    await expect(grade).toBeEnabled()
    // Only higher grades are offered.
    await expect(grade.locator('option', { hasText: seeded.gradeLow.code })).toHaveCount(0)
    await grade.selectOption({ label: `${seeded.gradeHigh.code} — E2E Senior Officer (level 44)` })
    await page.getByLabel('Justification').fill('Led the regional audit.')
    await page.getByRole('button', { name: 'Submit application' }).click()
    await expect(page.getByRole('heading', { name: /Promotion application #\d+/ })).toBeVisible()
    const appId = Number(/\/promotions\/(\d+)/.exec(page.url())?.[1])
    await expect(
      page.getByText('Waiting for an approver to review this application.'),
    ).toBeVisible()

    // 409: a second application while one is pending.
    await page.goto('/promotions/new')
    await expect(page.getByText('A pending application already exists')).toBeVisible()
    await page.getByLabel('Proposed grade').selectOption({ index: 1 })
    await page.getByLabel('Justification').fill('Again.')
    await page.getByRole('button', { name: 'Submit application' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Conflict' })).toContainText(
      'Employee already has a pending promotion application',
    )

    // 403: another employee's application.
    await page.goto(`/promotions/${otherApp.id}`)
    await expect(page.getByText('You do not have access to this')).toBeVisible()
    await signOut(page)

    // APPROVER reviews.
    await signIn(page, approver.username)
    await page.goto(`/promotions/${appId}`)
    await page.getByRole('radio', { name: 'Approve' }).check()
    await expect(page.getByText(/Must be after 1 Jan 2015/)).toBeVisible()

    // 422: effective date not after the current service record's start.
    await page.getByLabel('Effective date').fill('2015-01-01')
    await page.getByRole('button', { name: 'Submit review' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Approve' }).click()
    await expect(
      page.getByText('Must be after 2015-01-01, the start of the current service record'),
    ).toBeVisible()
    await expect(page.getByLabel('Effective date')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Effective date').fill('2026-11-01')
    await page.getByLabel('Remarks (optional)').fill('Well deserved.')
    await page.getByRole('button', { name: 'Submit review' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Approve' }).click()
    await expect(page.getByRole('heading', { name: 'Decision' })).toBeVisible()
    await expect(page.getByText('Approved').first()).toBeVisible()
    await expect(page.getByText('1 Nov 2026')).toBeVisible()

    // The employee's grade and service history follow the approval.
    await page.getByRole('link', { name: seeded.employee.full_name }).click()
    const history = page.getByRole('list', { name: /service records/i })
    await expect(history.getByRole('listitem').first()).toContainText(seeded.gradeHigh.code)
    await expect(history.getByRole('listitem').first()).toContainText('Promotion')
    await expect(history.getByRole('listitem')).toHaveCount(2)
  })

  test('a stale review shows the latest status (409) and self-review is blocked', async ({
    page,
  }) => {
    const api = await Api.login()
    const suffix = uniqueSuffix()
    const seeded = await seedEmployee(api, suffix)
    // An approver who is also the employee under review.
    const approver = await createUser(api, 'APPROVER', suffix, seeded.employee.id)
    const app = await api.create<{ id: number }>('/promotions', {
      employee_id: seeded.employee.id,
      proposed_grade_id: seeded.gradeHigh.id,
      justification: 'Ready for the next grade.',
    })

    await signIn(page, approver.username)
    await page.goto(`/promotions/${app.id}`)
    await expect(page.getByText('You cannot review your own application.')).toBeVisible()
    // The backend agrees (403), even if the UI were bypassed.
    const apiAsApprover = await Api.login(approver.username, 'E2e-Passw0rd!')
    const forbidden = await apiAsApprover.call('POST', `/promotions/${app.id}/review`, {
      status: 'REJECTED',
      remarks: 'Self review',
    })
    expect(forbidden.status).toBe(403)
    await signOut(page)

    // Admin opens the review, then someone else rejects it first.
    await signIn(page, 'admin', 'ChangeMe-2026')
    await page.goto(`/promotions/${app.id}`)
    await page.getByRole('radio', { name: 'Reject' }).check()
    await page.getByLabel(/^Remarks/).fill('Not this cycle.')
    const other = await createUser(api, 'APPROVER', `${suffix}B`)
    const otherApi = await Api.login(other.username, 'E2e-Passw0rd!')
    const first = await otherApi.call('POST', `/promotions/${app.id}/review`, {
      status: 'REJECTED',
      remarks: 'Rejected elsewhere.',
    })
    expect(first.status).toBe(200)

    await page.getByRole('button', { name: 'Submit review' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reject' }).click()
    await expect(page.getByText(/already been reviewed/)).toBeVisible()
    await expect(page.getByText('Rejected elsewhere.')).toBeVisible()
    await expect(page.getByText(`User #${other.id}`)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit review' })).toHaveCount(0)
  })
})
