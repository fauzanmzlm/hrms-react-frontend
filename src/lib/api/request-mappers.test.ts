import { describe, expect, it } from 'vitest'
import { toLoginRequest } from '@/features/auth/api'
import { toDisciplinaryReviewRequest } from '@/features/disciplinary/api'
import { toCreateUserRequest } from '@/features/users/api'
import { toEmployeeFormValues, toEmployeeRequest } from '@/features/employees/api'
import { toGradeRequest } from '@/features/grades/api'
import { toPromotionReviewRequest, toSubmitPromotionRequest } from '@/features/promotions/api'
import { toServiceRecordRequest } from '@/features/service-records/api'
import { makeEmployee } from '@/test/fixtures'

// The backend rejects unknown JSON fields with 400, so every body must
// contain exactly the documented keys.
const keys = (o: object) => Object.keys(o).sort()

describe('request mappers', () => {
  it('login', () => {
    expect(keys(toLoginRequest({ username: ' admin ', password: 'x' }))).toEqual([
      'password',
      'username',
    ])
  })

  it('grade', () => {
    const body = toGradeRequest({ code: 'N41', scheme: 'N', level: '41', title: 'Officer' })
    expect(body).toEqual({ code: 'N41', scheme: 'N', level: 41, title: 'Officer' })
  })

  it('employee: create includes the grade, edit does not', () => {
    const values = toEmployeeFormValues(makeEmployee({ confirmed_at: undefined }))
    const common = [
      'confirmed_at',
      'date_joined',
      'date_of_birth',
      'department',
      'email',
      'employee_no',
      'full_name',
      'gender',
      'ic_number',
      'phone',
      'position',
      'service_status',
    ]
    const create = toEmployeeRequest(values, 'create')
    expect(keys(create)).toEqual([...common, 'current_grade_id'].sort())
    expect(create.current_grade_id).toBe(1)
    expect(create.confirmed_at).toBeNull()
    expect(create.date_of_birth).toBe('1990-01-01')
    expect(keys(toEmployeeRequest(values, 'edit'))).toEqual(common)
  })

  it('service record: an empty end date is sent as null (current record)', () => {
    const body = toServiceRecordRequest({
      grade_id: '2',
      position: 'Officer',
      department: 'Finance',
      appointment_type: 'PERMANENT',
      effective_from: '2026-01-01',
      effective_to: '',
      remarks: ' ',
    })
    expect(body).toEqual({
      grade_id: 2,
      position: 'Officer',
      department: 'Finance',
      appointment_type: 'PERMANENT',
      effective_from: '2026-01-01',
      effective_to: null,
      remarks: '',
    })
  })

  it('disciplinary review never includes effective_date', () => {
    expect(
      toDisciplinaryReviewRequest({
        decision: 'APPROVED',
        remarks: '',
        effective_date: '2026-01-01',
      }),
    ).toEqual({ status: 'APPROVED', remarks: '' })
  })

  it('user: confirm_password stays client-side; employee_id only when linked', () => {
    const base = { username: ' hr1 ', password: 'Secret-123', confirm_password: 'Secret-123' }
    expect(toCreateUserRequest({ ...base, role: 'HR_OFFICER', employee_id: '' })).toEqual({
      username: 'hr1',
      password: 'Secret-123',
      role: 'HR_OFFICER',
    })
    expect(toCreateUserRequest({ ...base, role: 'EMPLOYEE', employee_id: '10' })).toEqual({
      username: 'hr1',
      password: 'Secret-123',
      role: 'EMPLOYEE',
      employee_id: 10,
    })
  })

  it('promotion: EMPLOYEE callers omit employee_id', () => {
    const values = { employee_id: '10', proposed_grade_id: '2', justification: ' Ready ' }
    expect(toSubmitPromotionRequest(values, true)).toEqual({
      proposed_grade_id: 2,
      justification: 'Ready',
    })
    expect(toSubmitPromotionRequest(values, false)).toEqual({
      employee_id: 10,
      proposed_grade_id: 2,
      justification: 'Ready',
    })
  })

  it('promotion review: effective_date only when approving', () => {
    const base = { remarks: ' ok ', effective_date: '2026-11-01' }
    expect(toPromotionReviewRequest({ ...base, decision: 'APPROVED' })).toEqual({
      status: 'APPROVED',
      remarks: 'ok',
      effective_date: '2026-11-01',
    })
    expect(keys(toPromotionReviewRequest({ ...base, decision: 'REJECTED' }))).toEqual([
      'remarks',
      'status',
    ])
  })
})
