/*
 * Types mirroring the Go backend (internal/domain and the request DTOs in
 * internal/delivery/http/handler). Response dates are RFC3339 strings such as
 * "2026-11-01T00:00:00Z"; request dates are "YYYY-MM-DD".
 */

export const ROLES = ['ADMIN', 'HR_OFFICER', 'APPROVER', 'EMPLOYEE'] as const
export type Role = (typeof ROLES)[number]

export const SERVICE_STATUSES = [
  'ACTIVE',
  'SUSPENDED',
  'RETIRED',
  'RESIGNED',
  'TERMINATED',
] as const
export type ServiceStatus = (typeof SERVICE_STATUSES)[number]

export const GENDERS = ['MALE', 'FEMALE'] as const
export type Gender = (typeof GENDERS)[number]

export const APPOINTMENT_TYPES = [
  'PERMANENT',
  'CONTRACT',
  'TEMPORARY',
  'SECONDMENT',
  'PROMOTION',
] as const
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number]

export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]
export type ReviewStatus = Exclude<ApprovalStatus, 'PENDING'>

export const OFFENSE_CATEGORIES = ['MINOR', 'SERIOUS'] as const
export type OffenseCategory = (typeof OFFENSE_CATEGORIES)[number]

/** Ordered from least to most severe, as in the backend. */
export const PENALTY_TYPES = [
  'WARNING',
  'FINE',
  'FORFEIT_EMOLUMENT',
  'SALARY_DEFERMENT',
  'SALARY_REDUCTION',
  'DEMOTION',
  'DISMISSAL',
] as const
export type PenaltyType = (typeof PENALTY_TYPES)[number]

/** Penalties the backend only accepts for SERIOUS cases. */
export const SERIOUS_ONLY_PENALTIES: readonly PenaltyType[] = ['DEMOTION', 'DISMISSAL']

export interface User {
  id: number
  username: string
  role: Role
  employee_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoginResult {
  access_token: string
  token_type: 'Bearer'
  expires_at: string
  user: User
}

export interface Grade {
  id: number
  code: string
  scheme: string
  level: number
  title: string
  created_at: string
  updated_at: string
}

export interface Employee {
  id: number
  employee_no: string
  ic_number: string
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: Gender
  current_grade_id: number
  position: string
  department: string
  service_status: ServiceStatus
  date_joined: string
  confirmed_at?: string
  created_at: string
  updated_at: string
}

export interface ServiceRecord {
  id: number
  employee_id: number
  grade_id: number
  position: string
  department: string
  appointment_type: AppointmentType
  effective_from: string
  /** Absent for the employee's current record. */
  effective_to?: string
  remarks: string
  created_at: string
  updated_at: string
}

export interface PromotionApplication {
  id: number
  employee_id: number
  current_grade_id: number
  proposed_grade_id: number
  justification: string
  status: ApprovalStatus
  submitted_at: string
  reviewed_by?: number
  reviewed_at?: string
  review_remarks: string
  effective_date?: string
  created_at: string
  updated_at: string
}

export interface DisciplinaryRecord {
  id: number
  employee_id: number
  case_no: string
  category: OffenseCategory
  description: string
  incident_date: string
  penalty: PenaltyType
  status: ApprovalStatus
  reported_by: number
  reviewed_by?: number
  reviewed_at?: string
  review_remarks: string
  created_at: string
  updated_at: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'INVALID_STATUS_TRANSITION'
  | 'VALIDATION_FAILED'
  | 'RULE_VIOLATION'
  | 'INTERNAL_ERROR'
  | 'UNAVAILABLE'

export interface ApiErrorDetail {
  code: ErrorCode | (string & {})
  message: string
  fields?: Record<string, string>
  request_id?: string
}

/* Request bodies. The backend rejects unknown fields, so these list exactly
 * the documented keys. */

export interface LoginRequest {
  username: string
  password: string
}

export interface CreateUserRequest {
  username: string
  password: string
  role: Role
  employee_id?: number
}

export interface GradeRequest {
  code: string
  scheme: string
  level: number
  title: string
}

export interface EmployeeRequest {
  employee_no: string
  ic_number: string
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: Gender
  /** Required on create; ignored by the backend on update. */
  current_grade_id?: number
  position: string
  department: string
  service_status: ServiceStatus
  date_joined: string
  confirmed_at: string | null
}

export interface ServiceRecordRequest {
  grade_id: number
  position: string
  department: string
  appointment_type: AppointmentType
  effective_from: string
  /** null marks the record as the employee's current one. */
  effective_to: string | null
  remarks: string
}

export interface SubmitPromotionRequest {
  /** Omitted by EMPLOYEE callers, who can only apply for themselves. */
  employee_id?: number
  proposed_grade_id: number
  justification: string
}

export interface PromotionReviewRequest {
  status: ReviewStatus
  remarks: string
  /** Required when approving; omitted when rejecting. */
  effective_date?: string
}

export interface DisciplinaryRequest {
  employee_id: number
  case_no: string
  category: OffenseCategory
  description: string
  incident_date: string
  penalty: PenaltyType
}

/** The backend returns 400 if effective_date is present on a disciplinary review. */
export interface DisciplinaryReviewRequest {
  status: ReviewStatus
  remarks: string
}

/* List filters (query parameters). */

export interface PageParams {
  page?: number
  page_size?: number
}

export interface EmployeeFilter extends PageParams {
  search?: string
  department?: string
  grade_id?: number
  status?: ServiceStatus
}

export interface PromotionFilter extends PageParams {
  employee_id?: number
  status?: ApprovalStatus
}

export interface DisciplinaryFilter extends PageParams {
  employee_id?: number
  status?: ApprovalStatus
  category?: OffenseCategory
}
