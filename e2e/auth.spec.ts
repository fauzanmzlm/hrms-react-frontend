import { expect, test } from '@playwright/test'
import { ADMIN, signIn, signOut, navLink } from './support'

test.describe('authentication', () => {
  test('rejects bad credentials inline', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill(ADMIN.username)
    await page.getByLabel('Password').fill('definitely-wrong')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Invalid username or password.')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('signs in as admin and out again', async ({ page }) => {
    await signIn(page, ADMIN.username, ADMIN.password)
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
    await expect(navLink(page, 'Create user')).toBeVisible()
    await signOut(page)
  })

  test('a rejected token signs the user out with a notice', async ({ page }) => {
    await signIn(page, ADMIN.username, ADMIN.password)
    await page.evaluate(() => {
      const raw = localStorage.getItem('hrms.session')
      if (!raw) throw new Error('no session stored')
      const session = JSON.parse(raw) as { token: string }
      session.token = `${session.token}tampered`
      localStorage.setItem('hrms.session', JSON.stringify(session))
    })
    await page.reload()
    await expect(page.getByText('Your session has expired. Please sign in again.')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated deep links return after sign-in', async ({ page }) => {
    await page.goto('/admin/users/new')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fusers%2Fnew/)
    await page.getByLabel('Username').fill(ADMIN.username)
    await page.getByLabel('Password').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/admin\/users\/new$/)
  })
})
