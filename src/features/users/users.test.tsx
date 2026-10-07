import { screen, waitFor } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeUser, signInAs } from '@/test/fixtures'
import { apiError, ok } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

async function fillAccount(user: ReturnType<typeof renderApp>['user'], role: string) {
  await user.type(await screen.findByLabelText(/^username/i), 'new.approver')
  await user.type(screen.getByLabelText(/^password/i), 'Sup3r-secret')
  await user.type(screen.getByLabelText(/confirm password/i), 'Sup3r-secret')
  await user.selectOptions(screen.getByLabelText(/^role/i), role)
}

describe('create user', () => {
  it('requires an employee record for EMPLOYEE accounts', async () => {
    signInAs('ADMIN')
    const { user } = renderApp('/admin/users/new')
    await fillAccount(user, 'EMPLOYEE')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    expect(
      await screen.findByText('Employee accounts must be linked to an employee record'),
    ).toBeInTheDocument()
  })

  it('creates a user without client-only fields and shows the result', async () => {
    signInAs('ADMIN')
    let body: unknown
    server.use(
      http.post('/api/v1/users', async ({ request }) => {
        body = await request.json()
        return ok(makeUser('APPROVER', { id: 9, username: 'new.approver' }), 201)
      }),
    )
    const { user } = renderApp('/admin/users/new')
    await fillAccount(user, 'APPROVER')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    // Shown in the toast and in the confirmation panel.
    expect(await screen.findAllByText('User new.approver created')).not.toHaveLength(0)
    expect(screen.getByText(/Approver account, user #9/)).toBeInTheDocument()
    expect(body).toEqual({ username: 'new.approver', password: 'Sup3r-secret', role: 'APPROVER' })
    await waitFor(() => expect(screen.getByLabelText(/^username/i)).toHaveValue(''))
  })

  it('puts a duplicate-username conflict on the username field', async () => {
    signInAs('ADMIN')
    server.use(
      http.post('/api/v1/users', () =>
        apiError(409, 'CONFLICT', 'resource already exists: username already exists'),
      ),
    )
    const { user } = renderApp('/admin/users/new')
    await fillAccount(user, 'APPROVER')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    const username = screen.getByLabelText(/^username/i)
    await waitFor(() => expect(username).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('Username already exists')).toBeInTheDocument()
    expect(username).toHaveFocus()
  })

  it('is admin only', async () => {
    signInAs('HR_OFFICER')
    renderApp('/admin/users/new')
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
  })
})
