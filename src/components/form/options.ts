export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

export function optionsFromLabels<K extends string>(
  values: readonly K[],
  labels: Record<K, string>,
): SelectOption[] {
  return values.map((value) => ({ value, label: labels[value] }))
}
