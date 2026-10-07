import { useGradeMap } from './hooks'

/** Shows a grade code (e.g. "N44") for a grade id, with the title as a tooltip. */
export function GradeLabel({
  id,
  withTitle = false,
}: {
  id: number | undefined
  withTitle?: boolean
}) {
  const grades = useGradeMap()
  if (id === undefined) return <span>—</span>
  const grade = grades.get(id)
  if (!grade) return <span className="text-muted-foreground">Grade #{id}</span>
  return (
    <span title={grade.title}>
      <span className="font-medium">{grade.code}</span>
      {withTitle && <span className="text-muted-foreground"> · {grade.title}</span>}
    </span>
  )
}
