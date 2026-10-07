import { useTable } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { coreFeatures, type ColumnList } from './columns'

interface DataTableProps<TData extends { id: number }> {
  /** Must be stable (module scope or memoised). */
  columns: ColumnList<TData>
  data: TData[]
  /** Accessible name of the table, read by screen readers. */
  caption: string
  /** Dims the rows while a new page is loading. */
  isFetching?: boolean
  empty?: ReactNode
}

const getRowId = (row: { id: number }) => String(row.id)

export function DataTable<TData extends { id: number }>({
  columns,
  data,
  caption,
  isFetching = false,
  empty,
}: DataTableProps<TData>) {
  const table = useTable({
    features: coreFeatures,
    columns: columns as ColumnList<TData> & unknown[],
    data,
    getRowId,
  })
  const rows = table.getRowModel().rows

  if (rows.length === 0 && empty) return <>{empty}</>

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table aria-busy={isFetching || undefined}>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id} scope="col">
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className={cn(isFetching && 'opacity-60 transition-opacity')}>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
