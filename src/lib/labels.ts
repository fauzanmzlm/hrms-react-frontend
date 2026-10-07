import type {
  AppointmentType,
  ApprovalStatus,
  Gender,
  OffenseCategory,
  PenaltyType,
  Role,
  ServiceStatus,
} from '@/lib/api/types'

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  HR_OFFICER: 'HR Officer',
  APPROVER: 'Approver',
  EMPLOYEE: 'Employee',
}

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  RETIRED: 'Retired',
  RESIGNED: 'Resigned',
  TERMINATED: 'Terminated',
}

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
}

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  PERMANENT: 'Permanent',
  CONTRACT: 'Contract',
  TEMPORARY: 'Temporary',
  SECONDMENT: 'Secondment',
  PROMOTION: 'Promotion',
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export const OFFENSE_CATEGORY_LABELS: Record<OffenseCategory, string> = {
  MINOR: 'Minor',
  SERIOUS: 'Serious',
}

export const PENALTY_LABELS: Record<PenaltyType, string> = {
  WARNING: 'Warning',
  FINE: 'Fine',
  FORFEIT_EMOLUMENT: 'Forfeiture of emoluments',
  SALARY_DEFERMENT: 'Salary increment deferment',
  SALARY_REDUCTION: 'Salary reduction',
  DEMOTION: 'Demotion',
  DISMISSAL: 'Dismissal',
}
