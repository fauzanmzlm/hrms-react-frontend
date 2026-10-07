import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { grades, makeEmployee, makeServiceRecord, signInAs } from '@/test/fixtures'
import { apiError, ok } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

function useGradesHandler() {
  server.use(http.get('/api/v1/grades', () => ok(grades)))
}

describe('employees', () => {
  it('maps 422 field errors from the API onto the form inputs', async () => {
    signInAs('HR_OFFICER')
    useGradesHandler()
    server.use(
      http.post('/api/v1/employees', () =>
        apiError(422, 'VALIDATION_FAILED', 'validation failed', {
          email: 'must be a valid email address',
          date_joined: 'must be after date_of_birth',
        }),
      ),
    )
    const { user } = renderApp('/employees/new')
    await screen.findByRole('heading', { name: 'New employee' })

    await user.type(screen.getByLabelText(/employee number/i), 'EMP-1')
    await user.type(screen.getByLabelText(/ic number/i), '900101-14-5678')
    await user.type(screen.getByLabelText(/full name/i), 'Siti Nurhaliza')
    await user.selectOptions(screen.getByLabelText(/gender/i), 'FEMALE')
    await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01')
    await user.type(screen.getByLabelText(/^email/i), 'siti@example.gov.my')
    await user.selectOptions(screen.getByLabelText(/starting grade/i), '1')
    await user.type(screen.getByLabelText(/^position/i), 'Officer')
    await user.type(screen.getByLabelText(/^department/i), 'Finance')
    await user.type(screen.getByLabelText(/date joined/i), '2015-01-01')
    await user.click(screen.getByRole('button', { name: 'Create employee' }))

    const email = screen.getByLabelText(/^email/i)
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('Must be a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Must be after date of birth')).toBeInTheDocument()
    expect(email).toHaveFocus()
  })

  it('validates the MyKad number before submitting', async () => {
    signInAs('HR_OFFICER')
    useGradesHandler()
    const { user } = renderApp('/employees/new')
    await user.type(await screen.findByLabelText(/ic number/i), '901301145678')
    await user.click(screen.getByRole('button', { name: 'Create employee' }))
    expect(
      await screen.findByText('Enter a 12-digit MyKad number, e.g. 900101-14-5678'),
    ).toBeInTheDocument()
  })

  it('blocks EMPLOYEE users from the employee list', async () => {
    signInAs('EMPLOYEE')
    renderApp('/employees')
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Employees' })).not.toBeInTheDocument()
  })

  it('shows the backend 403 when an EMPLOYEE opens someone else’s record', async () => {
    signInAs('EMPLOYEE')
    server.use(
      http.get('/api/v1/employees/99', () =>
        apiError(403, 'FORBIDDEN', 'forbidden: you can only access your own records'),
      ),
    )
    renderApp('/employees/99')
    expect(await screen.findByText('You do not have access to this')).toBeInTheDocument()
    expect(screen.getByText('You can only access your own records')).toBeInTheDocument()
  })

  it('shows grade codes instead of ids and the service timeline', async () => {
    signInAs('HR_OFFICER')
    useGradesHandler()
    server.use(
      http.get('/api/v1/employees/10', () => ok(makeEmployee({ current_grade_id: 2 }))),
      http.get('/api/v1/employees/10/service-records', () =>
        ok([
          makeServiceRecord({
            id: 2,
            grade_id: 2,
            effective_from: '2026-11-01T00:00:00Z',
            appointment_type: 'PROMOTION',
          }),
          makeServiceRecord({ id: 1, grade_id: 1, effective_to: '2026-10-31T00:00:00Z' }),
        ]),
      ),
    )
    renderApp('/employees/10')
    const history = await screen.findByRole('list', { name: /service records/i })
    const items = await within(history).findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText('N44')).toBeInTheDocument()
    expect(within(items[0]!).getByText('Current')).toBeInTheDocument()
    expect(within(items[0]!).getByText(/1 Nov 2026 – present/)).toBeInTheDocument()
    expect(within(items[1]!).getByText(/31 Oct 2026/)).toBeInTheDocument()
  })
})
