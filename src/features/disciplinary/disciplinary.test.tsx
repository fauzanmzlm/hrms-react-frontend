import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { grades, makeCase, makeEmployee, signInAs } from '@/test/fixtures'
import { ok } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

function useCommonHandlers() {
  server.use(
    http.get('/api/v1/grades', () => ok(grades)),
    http.get('/api/v1/employees/10', () => ok(makeEmployee())),
  )
}

const optionLabels = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    .map((o) => o.textContent)

describe('disciplinary case form', () => {
  it('offers demotion and dismissal only for serious cases', async () => {
    signInAs('HR_OFFICER')
    useCommonHandlers()
    const { user } = renderApp('/disciplinary/new?employee_id=10')
    const category = await screen.findByLabelText(/^category/i)
    const penalty = screen.getByLabelText(/proposed penalty/i)
    expect(penalty).toBeDisabled()

    await user.selectOptions(category, 'SERIOUS')
    expect(optionLabels(penalty)).toContain('Dismissal')
    await user.selectOptions(penalty, 'DISMISSAL')

    // Switching to MINOR drops the now-invalid penalty.
    await user.selectOptions(category, 'MINOR')
    expect(optionLabels(penalty)).not.toContain('Dismissal')
    expect(optionLabels(penalty)).not.toContain('Demotion')
    expect(penalty).toHaveValue('')
  })

  it('sends exactly the documented fields', async () => {
    signInAs('HR_OFFICER')
    useCommonHandlers()
    let body: unknown
    server.use(
      http.post('/api/v1/disciplinary-records', async ({ request }) => {
        body = await request.json()
        return ok(makeCase({ id: 71 }), 201)
      }),
      http.get('/api/v1/disciplinary-records/71', () => ok(makeCase({ id: 71 }))),
    )
    const { user, router } = renderApp('/disciplinary/new?employee_id=10')
    await user.type(await screen.findByLabelText(/case number/i), ' TT-1 ')
    await user.type(screen.getByLabelText(/incident date/i), '2026-08-01')
    await user.selectOptions(screen.getByLabelText(/^category/i), 'MINOR')
    await user.selectOptions(screen.getByLabelText(/proposed penalty/i), 'WARNING')
    await user.type(screen.getByLabelText(/^description/i), 'Late attendance.')
    await user.click(screen.getByRole('button', { name: 'Open case' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/disciplinary/71'))
    expect(body).toEqual({
      employee_id: 10,
      case_no: 'TT-1',
      category: 'MINOR',
      description: 'Late attendance.',
      incident_date: '2026-08-01',
      penalty: 'WARNING',
    })
  })
})

describe('disciplinary review', () => {
  it('blocks the reporting officer from reviewing', async () => {
    signInAs('APPROVER')
    useCommonHandlers()
    server.use(http.get('/api/v1/disciplinary-records/70', () => ok(makeCase({ reported_by: 3 }))))
    renderApp('/disciplinary/70')
    expect(
      await screen.findByText('You reported this case. Another approver must review it.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Approve' })).not.toBeInTheDocument()
  })

  it('warns before approving a dismissal and never sends effective_date', async () => {
    signInAs('APPROVER')
    useCommonHandlers()
    let body: unknown
    server.use(
      http.get('/api/v1/disciplinary-records/70', () =>
        ok(makeCase({ category: 'SERIOUS', penalty: 'DISMISSAL' })),
      ),
      http.post('/api/v1/disciplinary-records/70/review', async ({ request }) => {
        body = await request.json()
        return ok(
          makeCase({
            category: 'SERIOUS',
            penalty: 'DISMISSAL',
            status: 'APPROVED',
            reviewed_by: 3,
            reviewed_at: '2026-10-01T02:00:00Z',
          }),
        )
      }),
    )
    const { user } = renderApp('/disciplinary/70')
    expect(await screen.findByText('Approving dismisses the employee')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Approve' }))
    expect(screen.queryByLabelText(/effective date/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Submit review' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(
      within(dialog).getByText('The employee will be marked as Terminated.'),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))

    expect(await screen.findByText('Penalty imposed')).toBeInTheDocument()
    expect(body).toEqual({ status: 'APPROVED', remarks: '' })
  })
})
