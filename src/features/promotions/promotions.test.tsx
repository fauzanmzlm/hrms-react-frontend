import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { grades, makeEmployee, makePromotion, makeServiceRecord, signInAs } from '@/test/fixtures'
import { apiError, ok } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

function useCommonHandlers() {
  server.use(
    http.get('/api/v1/grades', () => ok(grades)),
    http.get('/api/v1/employees/10', () => ok(makeEmployee())),
    http.get('/api/v1/employees/10/service-records', () =>
      ok([makeServiceRecord({ effective_from: '2015-03-01T00:00:00Z' })]),
    ),
  )
}

const emptyPage = { items: [], total: 0, page: 1, page_size: 1 }

describe('promotion application form', () => {
  it('lets an EMPLOYEE apply for themselves with only higher grades offered', async () => {
    signInAs('EMPLOYEE')
    useCommonHandlers()
    let body: unknown
    server.use(
      http.get('/api/v1/promotions', () => ok(emptyPage)),
      http.post('/api/v1/promotions', async ({ request }) => {
        body = await request.json()
        return ok(makePromotion({ id: 51 }), 201)
      }),
      http.get('/api/v1/promotions/51', () => ok(makePromotion({ id: 51 }))),
    )
    const { user, router } = renderApp('/promotions/new')

    expect(screen.queryByRole('combobox', { name: /employee/i })).not.toBeInTheDocument()
    const grade = await screen.findByLabelText(/proposed grade/i)
    await waitFor(() => expect(grade).toBeEnabled())
    const offered = within(grade)
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(offered).toEqual([
      'Select a grade',
      'N44 — Pegawai Tadbir Kanan (level 44)',
      'N48 — Ketua Penolong Pengarah (level 48)',
    ])

    await user.selectOptions(grade, '2')
    await user.type(screen.getByLabelText(/justification/i), 'Led the audit project.')
    await user.click(screen.getByRole('button', { name: 'Submit application' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/promotions/51'))
    expect(body).toEqual({ proposed_grade_id: 2, justification: 'Led the audit project.' })
  })

  it('explains a RULE_VIOLATION from the backend', async () => {
    signInAs('EMPLOYEE')
    useCommonHandlers()
    server.use(
      http.get('/api/v1/promotions', () => ok(emptyPage)),
      http.post('/api/v1/promotions', () =>
        apiError(
          422,
          'RULE_VIOLATION',
          'business rule violation: employee has an approved disciplinary penalty within the last 12 months',
        ),
      ),
    )
    const { user } = renderApp('/promotions/new')
    const grade = await screen.findByLabelText(/proposed grade/i)
    await waitFor(() => expect(grade).toBeEnabled())
    await user.selectOptions(grade, '2')
    await user.type(screen.getByLabelText(/justification/i), 'Ready.')
    await user.click(screen.getByRole('button', { name: 'Submit application' }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Not allowed by policy')).toBeInTheDocument()
    expect(
      within(alert).getByText(
        'Employee has an approved disciplinary penalty within the last 12 months',
      ),
    ).toBeInTheDocument()
  })

  it('warns about an existing pending application', async () => {
    signInAs('EMPLOYEE')
    useCommonHandlers()
    server.use(
      http.get('/api/v1/promotions', () =>
        ok({ items: [makePromotion({ id: 50 })], total: 1, page: 1, page_size: 1 }),
      ),
    )
    renderApp('/promotions/new')
    expect(await screen.findByText('A pending application already exists')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View application #50' })).toHaveAttribute(
      'href',
      '/promotions/50',
    )
  })
})

describe('promotion review', () => {
  it('requires remarks when rejecting, without calling the API', async () => {
    signInAs('APPROVER')
    useCommonHandlers()
    let called = false
    server.use(
      http.get('/api/v1/promotions/50', () => ok(makePromotion())),
      http.post('/api/v1/promotions/50/review', () => {
        called = true
        return ok(makePromotion())
      }),
    )
    const { user } = renderApp('/promotions/50')
    await user.click(await screen.findByRole('radio', { name: 'Reject' }))
    await user.click(screen.getByRole('button', { name: 'Submit review' }))
    expect(await screen.findByText('Remarks are required when rejecting')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('approves with an effective date after the current service record', async () => {
    signInAs('APPROVER')
    useCommonHandlers()
    let body: unknown
    let approved = false
    server.use(
      http.get('/api/v1/promotions/50', () =>
        ok(
          approved
            ? makePromotion({
                status: 'APPROVED',
                reviewed_by: 3,
                reviewed_at: '2026-10-01T02:00:00Z',
                effective_date: '2026-11-01T00:00:00Z',
              })
            : makePromotion(),
        ),
      ),
      http.post('/api/v1/promotions/50/review', async ({ request }) => {
        body = await request.json()
        approved = true
        return ok(
          makePromotion({
            status: 'APPROVED',
            reviewed_by: 3,
            reviewed_at: '2026-10-01T02:00:00Z',
            effective_date: '2026-11-01T00:00:00Z',
          }),
        )
      }),
      http.get('/api/v1/promotions', () => ok(emptyPage)),
    )
    const { user } = renderApp('/promotions/50')
    await user.click(await screen.findByRole('radio', { name: 'Approve' }))
    const date = screen.getByLabelText(/effective date/i)
    expect(await screen.findByText(/must be after 1 Mar 2015/i)).toBeInTheDocument()
    expect(date).toHaveAttribute('min', '2015-03-02')
    await user.type(date, '2026-11-01')
    await user.click(screen.getByRole('button', { name: 'Submit review' }))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))

    expect(await screen.findByRole('heading', { name: 'Decision' })).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('1 Nov 2026')).toBeInTheDocument()
    expect(body).toEqual({ status: 'APPROVED', remarks: '', effective_date: '2026-11-01' })
  })

  it('refreshes and shows the new status when someone else reviewed first (409)', async () => {
    signInAs('APPROVER')
    useCommonHandlers()
    let reviewed = false
    server.use(
      http.get('/api/v1/promotions/50', () =>
        ok(
          reviewed
            ? makePromotion({
                status: 'REJECTED',
                reviewed_by: 1,
                reviewed_at: '2026-10-01T02:00:00Z',
                review_remarks: 'Not this cycle.',
              })
            : makePromotion(),
        ),
      ),
      http.post('/api/v1/promotions/50/review', () => {
        reviewed = true
        return apiError(
          409,
          'INVALID_STATUS_TRANSITION',
          'invalid status transition: promotion application is already REJECTED',
        )
      }),
      http.get('/api/v1/promotions', () => ok(emptyPage)),
    )
    const { user } = renderApp('/promotions/50')
    await user.click(await screen.findByRole('radio', { name: 'Reject' }))
    await user.type(screen.getByLabelText(/^remarks/i), 'Insufficient evidence.')
    await user.click(screen.getByRole('button', { name: 'Submit review' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reject' }),
    )

    expect(await screen.findByText('Not this cycle.')).toBeInTheDocument()
    expect(screen.getByText('User #1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit review' })).not.toBeInTheDocument()
  })

  it('does not offer a review of your own application', async () => {
    signInAs('APPROVER', { employee_id: 10 })
    useCommonHandlers()
    server.use(http.get('/api/v1/promotions/50', () => ok(makePromotion())))
    renderApp('/promotions/50')
    expect(await screen.findByText('You cannot review your own application.')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Approve' })).not.toBeInTheDocument()
  })

  it('treats a malformed id as not found instead of loading forever', async () => {
    signInAs('APPROVER')
    renderApp('/promotions/abc')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('blocks EMPLOYEE users from reviewing', async () => {
    signInAs('EMPLOYEE')
    useCommonHandlers()
    server.use(http.get('/api/v1/promotions/50', () => ok(makePromotion())))
    renderApp('/promotions/50')
    expect(
      await screen.findByText('Waiting for an approver to review this application.'),
    ).toBeInTheDocument()
  })
})
