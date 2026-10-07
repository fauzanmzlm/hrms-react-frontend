import { expect, test } from '@playwright/test'
import { ADMIN, PASSWORD, signIn, signOut, uniqueIc, uniqueSuffix, navLink } from './support'

/*
 * The full flow through the UI only, one role at a time:
 * ADMIN creates users and grades → HR creates an employee and a service record
 * → the EMPLOYEE applies for promotion → the APPROVER approves it and the grade
 * and history update → a disciplinary case is opened and approved → the next
 * promotion application is blocked.
 */
test('full role walkthrough', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  const s = uniqueSuffix()
  const lower = s.toLowerCase()
  const grade = {
    low: `W${s}L`.slice(0, 10),
    high: `W${s}H`.slice(0, 10),
    top: `W${s}T`.slice(0, 10),
  }
  const users = { hr: `hr_${lower}`, approver: `approver_${lower}`, staff: `staff_${lower}` }
  const employee = { no: `WALK-${s}`, name: `Walkthrough Staff ${s}` }
  const shot = (name: string) =>
    page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true })

  async function createUser(username: string, role: string, employeeNo?: string) {
    await page.goto('/admin/users/new')
    await page.getByLabel('Username').fill(username)
    await page.getByLabel(/^Password/).fill(PASSWORD)
    await page.getByLabel('Confirm password').fill(PASSWORD)
    await page.getByLabel('Role').selectOption(role)
    if (employeeNo) {
      await page.getByRole('combobox', { name: /Employee record/ }).click()
      await page.getByPlaceholder('Search name, employee no. or IC…').fill(employeeNo)
      await page.getByRole('option', { name: new RegExp(employeeNo) }).click()
    }
    await page.getByRole('button', { name: 'Create user' }).click()
    await expect(
      page.getByRole('alert').filter({ hasText: `User ${username} created` }),
    ).toBeVisible()
  }

  async function createGrade(code: string, level: string, title: string) {
    await page.getByRole('button', { name: 'New grade' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Code').fill(code)
    await dialog.getByLabel('Scheme').fill('WALK')
    await dialog.getByLabel('Level').fill(level)
    await dialog.getByLabel('Title').fill(title)
    await dialog.getByRole('button', { name: 'Save grade' }).click()
    await expect(page.getByRole('cell', { name: code, exact: true })).toBeVisible()
  }

  const gradeOption = (code: string, title: string, level: number) =>
    `${code} — ${title} (level ${level})`

  // 1. ADMIN: grades and staff accounts.
  await signIn(page, ADMIN.username, ADMIN.password)
  await navLink(page, 'Grades').click()
  await createGrade(grade.low, '41', 'Walk Officer')
  await createGrade(grade.high, '44', 'Walk Senior Officer')
  await createGrade(grade.top, '48', 'Walk Principal Officer')
  await createUser(users.hr, 'HR_OFFICER')
  await createUser(users.approver, 'APPROVER')
  await signOut(page)

  // 2. HR: the employee and their first service record.
  await signIn(page, users.hr)
  await navLink(page, 'Employees').click()
  await page.getByRole('link', { name: 'New employee' }).click()
  await page.getByLabel('Employee number').fill(employee.no)
  await page.getByLabel('IC number (MyKad)').fill(uniqueIc())
  await page.getByLabel('Full name').fill(employee.name)
  await page.getByLabel('Gender').selectOption('FEMALE')
  await page.getByLabel('Date of birth').fill('1990-04-12')
  await page.getByLabel('Email').fill(`walk.${lower}@example.gov.my`)
  await page
    .getByLabel('Starting grade')
    .selectOption({ label: gradeOption(grade.low, 'Walk Officer', 41) })
  await page.getByRole('textbox', { name: 'Position', exact: true }).fill('Administrative Officer')
  await page.getByRole('textbox', { name: 'Department', exact: true }).fill('Finance')
  await page.getByLabel('Date joined').fill('2020-01-01')
  await page.getByRole('button', { name: 'Create employee' }).click()
  await expect(page.getByRole('heading', { name: employee.name })).toBeVisible()
  await page.getByRole('button', { name: 'Add first service record' }).click()
  const recordDialog = page.getByRole('dialog')
  await recordDialog.getByLabel('Appointment type').selectOption('PERMANENT')
  await recordDialog.getByLabel('Effective from').fill('2020-01-01')
  await recordDialog.getByRole('button', { name: 'Save record' }).click()
  await expect(
    page.getByRole('list', { name: /service records/i }).getByRole('listitem'),
  ).toHaveCount(1)
  await signOut(page)

  // ADMIN links a login to the new employee.
  await signIn(page, ADMIN.username, ADMIN.password)
  await createUser(users.staff, 'EMPLOYEE', employee.no)
  await signOut(page)

  // 3. EMPLOYEE: applies for promotion from the dashboard.
  await signIn(page, users.staff)
  await expect(page.getByRole('heading', { name: `Welcome, ${employee.name}` })).toBeVisible()
  await page.getByRole('link', { name: 'Apply for promotion' }).click()
  await page
    .getByLabel('Proposed grade')
    .selectOption({ label: gradeOption(grade.high, 'Walk Senior Officer', 44) })
  await page.getByLabel('Justification').fill('Led the 2026 budget consolidation.')
  await page.getByRole('button', { name: 'Submit application' }).click()
  await expect(page.getByRole('heading', { name: /Promotion application #\d+/ })).toBeVisible()
  const promotionUrl = page.url()
  await signOut(page)

  // 4. APPROVER: approves from the review queue.
  await signIn(page, users.approver)
  await navLink(page, 'Promotion applications').click()
  await page.goto(promotionUrl)
  await page.getByRole('radio', { name: 'Approve' }).check()
  await page.getByLabel('Effective date').fill('2026-11-01')
  await page.getByLabel('Remarks (optional)').fill('Strong record.')
  await shot('1-approver-review')
  await page.getByRole('button', { name: 'Submit review' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByRole('heading', { name: 'Decision' })).toBeVisible()

  // The grade and service history follow.
  await page.getByRole('link', { name: employee.name }).click()
  const history = page.getByRole('list', { name: /service records/i })
  await expect(history.getByRole('listitem')).toHaveCount(2)
  await expect(history.getByRole('listitem').first()).toContainText(grade.high)
  await expect(history.getByRole('listitem').first()).toContainText('Promotion')
  await expect(history.getByRole('listitem').first()).toContainText('1 Nov 2026 – present')
  await expect(history.getByRole('listitem').nth(1)).toContainText('31 Oct 2026')
  await shot('2-employee-after-promotion')
  await signOut(page)

  // 5. HR opens a disciplinary case; the APPROVER approves it.
  await signIn(page, users.hr)
  await navLink(page, 'Employees').click()
  await page.getByLabel('Search').fill(employee.no)
  await page.getByRole('link', { name: employee.name }).click()
  await page.getByRole('link', { name: 'Open case' }).click()
  await page.getByLabel('Case number').fill(`TT-${s}`)
  await page.getByLabel('Incident date').fill('2026-09-15')
  await page.getByLabel('Category').selectOption('MINOR')
  await page.getByLabel('Proposed penalty').selectOption('WARNING')
  await page
    .getByRole('textbox', { name: 'Description' })
    .fill('Unauthorised absence on 15 Sep 2026.')
  await page.getByRole('button', { name: 'Open case' }).click()
  await expect(page.getByRole('heading', { name: `Case TT-${s}` })).toBeVisible()
  await signOut(page)

  await signIn(page, users.approver)
  await page
    .getByRole('list', { name: 'Disciplinary cases to review' })
    .getByRole('link', { name: `TT-${s}` })
    .click()
  await page.getByRole('radio', { name: 'Approve' }).check()
  await page.getByRole('button', { name: 'Submit review' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Penalty imposed')).toBeVisible()
  await signOut(page)

  // 6. The next promotion is blocked.
  await signIn(page, users.staff)
  await expect(page.getByText(grade.high).first()).toBeVisible()
  await page.getByRole('link', { name: 'Apply for promotion' }).click()
  await expect(page.getByText('Approved disciplinary case on record')).toBeVisible()
  await page
    .getByLabel('Proposed grade')
    .selectOption({ label: gradeOption(grade.top, 'Walk Principal Officer', 48) })
  await page.getByLabel('Justification').fill('Ready for the next level.')
  await page.getByRole('button', { name: 'Submit application' }).click()
  const blocked = page.getByRole('alert').filter({ hasText: 'Not allowed by policy' })
  await expect(blocked).toContainText(
    'Employee has an approved disciplinary penalty within the last 12 months',
  )
  await shot('3-promotion-blocked')
  await page.goto('/')
  await shot('4-employee-dashboard')
})

test('staff dashboards', async ({ page }, testInfo) => {
  await signIn(page, ADMIN.username, ADMIN.password)
  await expect(page.getByRole('region', { name: 'Summary' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Directory (A–Z)' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('admin-dashboard.png'), fullPage: true })
})
