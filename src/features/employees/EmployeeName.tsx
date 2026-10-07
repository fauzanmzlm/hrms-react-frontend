import { Link } from 'react-router'
import { useEmployee } from './hooks'

interface EmployeeNameProps {
  id: number
  /** Links to the employee's record. */
  link?: boolean
  showNumber?: boolean
}

/** Resolves an employee id to a name using the shared per-id cache. */
export function EmployeeName({ id, link = false, showNumber = false }: EmployeeNameProps) {
  const { data, isPending, isError } = useEmployee(id)
  if (isPending) return <span className="text-muted-foreground">Loading…</span>
  if (isError || !data) return <span className="text-muted-foreground">Employee #{id}</span>
  const label = (
    <>
      {data.full_name}
      {showNumber && <span className="text-muted-foreground"> · {data.employee_no}</span>}
    </>
  )
  return link ? (
    <Link to={`/employees/${id}`} className="font-medium underline-offset-4 hover:underline">
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  )
}
