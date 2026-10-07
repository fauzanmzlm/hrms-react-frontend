import type {
  DisciplinaryRecord,
  Employee,
  Grade,
  PromotionApplication,
  Role,
  ServiceRecord,
  User,
} from '@/lib/api/types'
import { saveSession } from '@/lib/session'

const TS = '2026-01-01T00:00:00Z'

export const grades: Grade[] = [
  {
    id: 1,
    code: 'N41',
    scheme: 'N',
    level: 41,
    title: 'Pegawai Tadbir',
    created_at: TS,
    updated_at: TS,
  },
  {
    id: 2,
    code: 'N44',
    scheme: 'N',
    level: 44,
    title: 'Pegawai Tadbir Kanan',
    created_at: TS,
    updated_at: TS,
  },
  {
    id: 3,
    code: 'N48',
    scheme: 'N',
    level: 48,
    title: 'Ketua Penolong Pengarah',
    created_at: TS,
    updated_at: TS,
  },
  {
    id: 4,
    code: 'N29',
    scheme: 'N',
    level: 29,
    title: 'Penolong Pegawai Tadbir',
    created_at: TS,
    updated_at: TS,
  },
]

export function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 10,
    employee_no: 'EMP-0010',
    ic_number: '900101145678',
    full_name: 'Aminah binti Ali',
    email: 'aminah@example.gov.my',
    phone: '0123456789',
    date_of_birth: '1990-01-01T00:00:00Z',
    gender: 'FEMALE',
    current_grade_id: 1,
    position: 'Pegawai Tadbir',
    department: 'Finance',
    service_status: 'ACTIVE',
    date_joined: '2015-03-01T00:00:00Z',
    created_at: TS,
    updated_at: TS,
    ...overrides,
  }
}

export function makeServiceRecord(overrides: Partial<ServiceRecord> = {}): ServiceRecord {
  return {
    id: 100,
    employee_id: 10,
    grade_id: 1,
    position: 'Pegawai Tadbir',
    department: 'Finance',
    appointment_type: 'PERMANENT',
    effective_from: '2015-03-01T00:00:00Z',
    remarks: '',
    created_at: TS,
    updated_at: TS,
    ...overrides,
  }
}

export function makePromotion(overrides: Partial<PromotionApplication> = {}): PromotionApplication {
  return {
    id: 50,
    employee_id: 10,
    current_grade_id: 1,
    proposed_grade_id: 2,
    justification: 'Consistently exceeded targets.',
    status: 'PENDING',
    submitted_at: '2026-09-01T03:00:00Z',
    review_remarks: '',
    created_at: TS,
    updated_at: TS,
    ...overrides,
  }
}

export function makeCase(overrides: Partial<DisciplinaryRecord> = {}): DisciplinaryRecord {
  return {
    id: 70,
    employee_id: 10,
    case_no: 'TT-2026-001',
    category: 'MINOR',
    description: 'Late attendance.',
    incident_date: '2026-08-01T00:00:00Z',
    penalty: 'WARNING',
    status: 'PENDING',
    reported_by: 2,
    review_remarks: '',
    created_at: TS,
    updated_at: TS,
    ...overrides,
  }
}

const USER_IDS: Record<Role, number> = { ADMIN: 1, HR_OFFICER: 2, APPROVER: 3, EMPLOYEE: 4 }

export function makeUser(role: Role, overrides: Partial<User> = {}): User {
  return {
    id: USER_IDS[role],
    username: role.toLowerCase(),
    role,
    employee_id: role === 'EMPLOYEE' ? 10 : undefined,
    is_active: true,
    created_at: TS,
    updated_at: TS,
    ...overrides,
  }
}

/** Stores a valid session so the app starts signed in. */
export function signInAs(role: Role, overrides: Partial<User> = {}): User {
  const user = makeUser(role, overrides)
  saveSession({
    token: `token-${role}`,
    expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
    user,
  })
  return user
}
