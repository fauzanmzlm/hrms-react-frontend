import { expect, test } from '@playwright/test'
import {
  ADMIN,
  Api,
  createUser,
  seedEmployee,
  signIn,
  uniqueIc,
  uniqueSuffix,
  navLink,
} from './support'

test.describe('Perkhidmatan', () => {
  test('admin manages grades; duplicates and in-use deletes are explained', async ({ page }) => {
    const suffix = uniqueSuffix()
    const code = `G${suffix}`.slice(0, 10)
    await signIn(page, ADMIN.username, ADMIN.password)
    await navLink(page, 'Grades').click()

    await page.getByRole('button', { name: 'New grade' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Code').fill(code)
    await dialog.getByLabel('Scheme').fill('E2E')
    await dialog.getByLabel('Level').fill('41')
    await dialog.getByLabel('Title').fill('E2E Grade')
    await dialog.getByRole('button', { name: 'Save grade' }).click()
    await expect(page.getByText(`Grade ${code} created`)).toBeVisible()
    await expect(page.getByRole('cell', { name: code, exact: true })).toBeVisible()

    // 409: duplicate code
    await page.getByRole('button', { name: 'New grade' }).click()
    await dialog.getByLabel('Code').fill(code)
    await dialog.getByLabel('Scheme').fill('E2E')
    await dialog.getByLabel('Level').fill('42')
    await dialog.getByLabel('Title').fill('Duplicate')
    await dialog.getByRole('button', { name: 'Save grade' }).click()
    await expect(dialog.getByText('Grade code already exists')).toBeVisible()
    await expect(dialog.getByLabel('Code')).toHaveAttribute('aria-invalid', 'true')
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    // 409: grade still referenced by an employee
    const api = await Api.login()
    const seeded = await seedEmployee(api)
    await page.reload()
    await page.getByRole('button', { name: `Delete grade ${seeded.gradeLow.code}` }).click()
    await page.getByRole('button', { name: 'Delete grade' }).click()
    await expect(page.getByText('Record is still referenced by other records')).toBeVisible()
  })

  test('HR creates an employee and builds the service history', async ({ page }) => {
    const api = await Api.login()
    const suffix = uniqueSuffix()
    const existing = await seedEmployee(api, suffix)
    const hr = await createUser(api, 'HR_OFFICER', suffix)
    const newSuffix = uniqueSuffix()

    await signIn(page, hr.username)
    await navLink(page, 'Employees').click()
    await page.getByRole('link', { name: 'New employee' }).click()

    await page.getByLabel('Employee number').fill(`E2E-${newSuffix}`)
    await page.getByLabel('IC number (MyKad)').fill('901301-14-5678')
    await page.getByLabel('Full name').fill(`E2E New Hire ${newSuffix}`)
    await page.getByLabel('Gender').selectOption('MALE')
    await page.getByLabel('Date of birth').fill('1992-05-05')
    // 409 from the backend: the email is already used by another employee.
    await page.getByLabel('Email').fill(`e2e.${suffix.toLowerCase()}@example.gov.my`)
    await page
      .getByLabel('Starting grade')
      .selectOption({ label: `${existing.gradeLow.code} — E2E Officer (level 41)` })
    await page.getByRole('textbox', { name: 'Position', exact: true }).fill('Officer')
    await page.getByRole('textbox', { name: 'Department', exact: true }).fill('E2E Department')
    await page.getByLabel('Date joined').fill('2020-02-01')
    await page.getByRole('button', { name: 'Create employee' }).click()

    // Client-side hint first (invalid month in the IC number).
    await expect(page.getByText('Enter a 12-digit MyKad number, e.g. 900101-14-5678')).toBeVisible()
    await page.getByLabel('IC number (MyKad)').fill(uniqueIc())
    await page.getByRole('button', { name: 'Create employee' }).click()
    await expect(page.getByText('Email already exists')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeFocused()

    await page.getByLabel('Email').fill(`new.${newSuffix.toLowerCase()}@example.gov.my`)
    await page.getByRole('button', { name: 'Create employee' }).click()
    await expect(page.getByRole('heading', { name: `E2E New Hire ${newSuffix}` })).toBeVisible()

    // First service record from the empty state.
    await page.getByRole('button', { name: 'Add first service record' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Appointment type').selectOption('PERMANENT')
    await dialog.getByLabel('Effective from').fill('2020-02-01')
    await dialog.getByRole('button', { name: 'Save record' }).click()
    const history = page.getByRole('list', { name: /service records/i })
    await expect(history.getByText('Current')).toBeVisible()
    await expect(history.getByText(existing.gradeLow.code)).toBeVisible()

    // 422: a new current record must start after the current one.
    await page.getByRole('button', { name: 'Add record' }).click()
    await dialog
      .getByLabel('Grade')
      .selectOption({ label: `${existing.gradeHigh.code} — E2E Senior Officer (level 44)` })
    await dialog.getByLabel('Appointment type').selectOption('PERMANENT')
    await dialog.getByLabel('Effective from').fill('2019-01-01')
    await dialog.getByRole('button', { name: 'Save record' }).click()
    await expect(dialog.getByText(/Must be after 2020-02-01/)).toBeVisible()
    await expect(dialog.getByLabel('Effective from')).toHaveAttribute('aria-invalid', 'true')

    await dialog.getByLabel('Effective from').fill('2024-01-01')
    await dialog.getByRole('button', { name: 'Save record' }).click()
    await expect(history.getByRole('listitem')).toHaveCount(2)
    await expect(history.getByRole('listitem').first()).toContainText(existing.gradeHigh.code)
    // The employee's grade follows the current service record.
    await expect(page.getByText(`${existing.gradeHigh.code}`).first()).toBeVisible()

    // Search finds the new employee in the list.
    await navLink(page, 'Employees').click()
    await page.getByLabel('Search').fill(`New Hire ${newSuffix}`)
    await expect(page.getByRole('link', { name: `E2E New Hire ${newSuffix}` })).toBeVisible()
    await expect(page).toHaveURL(/search=New\+Hire/)
  })

  test('an EMPLOYEE sees only their own record', async ({ page }) => {
    const api = await Api.login()
    const suffix = uniqueSuffix()
    const mine = await seedEmployee(api, suffix)
    const other = await seedEmployee(api)
    const staff = await createUser(api, 'EMPLOYEE', suffix, mine.employee.id)

    await signIn(page, staff.username)
    await navLink(page, 'My service record').click()
    await expect(page.getByRole('heading', { name: mine.employee.full_name })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)

    // Route guard (client) and record-level 403 (backend).
    await page.goto('/employees')
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
    await page.goto(`/employees/${other.employee.id}`)
    await expect(page.getByText('You do not have access to this')).toBeVisible()
    await expect(page.getByText('You can only access your own records')).toBeVisible()
  })
})
