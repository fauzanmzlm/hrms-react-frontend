import type { SelectOptionGroup } from '@/components/form/options'
import type { Grade } from '@/lib/api/types'

/** Grades grouped by scheme for a select, lowest level first. */
export function gradeOptionGroups(grades: readonly Grade[]): SelectOptionGroup[] {
  const groups = new Map<string, Grade[]>()
  for (const grade of grades) {
    groups.set(grade.scheme, [...(groups.get(grade.scheme) ?? []), grade])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([scheme, items]) => ({
      label: `Scheme ${scheme}`,
      options: items
        .sort((a, b) => a.level - b.level || a.code.localeCompare(b.code))
        .map((g) => ({ value: String(g.id), label: `${g.code} — ${g.title} (level ${g.level})` })),
    }))
}
