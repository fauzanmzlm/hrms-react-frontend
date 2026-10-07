import {
  createColumnHelper,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'

/** Tables only render rows; filtering, sorting and paging happen on the server. */
export const coreFeatures = tableFeatures({})
export type CoreFeatures = typeof coreFeatures

export function columnHelper<TData extends RowData>() {
  return createColumnHelper<CoreFeatures, TData>()
}

// Each column has its own value type, so the array is typed loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ColumnList<TData extends RowData> = ReadonlyArray<ColumnDef<CoreFeatures, TData, any>>
