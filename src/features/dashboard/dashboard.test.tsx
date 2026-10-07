import { screen, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { grades, makeCase, makeEmployee, makePromotion, signInAs } from '@/test/fixtures'
import { ok } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

const page = <T,>(items: T[], total = items.length) => ({ items, total, page: 1, page_size: 20 })

describe('dashboards', () => {
  it('shows HR headcount from list totals, review queues and the directory', async () => {
    signInAs('HR_OFFICER')
    server.use(
      http.get('/api/v1/grades', () => ok(grades)),
      http.get('/api/v1/employees', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('page_size') === '1') {
          return ok(page([], url.searchParams.get('status') === 'ACTIVE' ? 120 : 134))
        }
        return ok(page([makeEmployee()], 134))
      }),
      http.get('/api/v1/promotions', ({ request }) =>
        new URL(request.url).searchParams.get('page_size') === '1'
          ? ok(page([], 3))
          : ok(page([makePromotion()], 3)),
      ),
      http.get('/api/v1/disciplinary-records', () => ok(page([makeCase()], 1))),
    )
    renderApp('/')

    const summary = await screen.findByRole('region', { name: 'Summary' })
    expect(await within(summary).findByText('120')).toBeInTheDocument()
    expect(within(summary).getByText('134')).toBeInTheDocument()
    expect(within(summary).getByText('3')).toBeInTheDocument()

    const queue = await screen.findByRole('list', { name: 'Pending promotion applications' })
    expect(within(queue).getByRole('link', { name: '#50' })).toHaveAttribute(
      'href',
      '/promotions/50',
    )
    expect(await within(queue).findByText('Aminah binti Ali')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Pending disciplinary cases' })).getByText(
        'TT-2026-001',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Directory' })).toBeInTheDocument()
  })

  it('gives approvers their review queues only', async () => {
    signInAs('APPROVER')
    server.use(http.get('/api/v1/grades', () => ok(grades)))
    renderApp('/')
    expect(await screen.findByText('Promotions to review')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Disciplinary cases to review' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Directory (A–Z)' })).not.toBeInTheDocument()
  })

  it('shows an EMPLOYEE their placement, applications and cases', async () => {
    signInAs('EMPLOYEE')
    server.use(
      http.get('/api/v1/grades', () => ok(grades)),
      http.get('/api/v1/employees/10', () => ok(makeEmployee())),
      http.get('/api/v1/promotions', () => ok(page([makePromotion({ status: 'REJECTED' })]))),
    )
    renderApp('/')
    expect(
      await screen.findByRole('heading', { name: 'Welcome, Aminah binti Ali' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Apply for promotion' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'My placement' })).toBeInTheDocument()
    expect(await screen.findByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText('No disciplinary cases.')).toBeInTheDocument()
  })
})
