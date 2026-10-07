import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { columnHelper } from '@/components/data-table/columns'
import { DataTable } from '@/components/data-table/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { toastError } from '@/lib/api/errors'
import type { Grade } from '@/lib/api/types'
import { GradeFormDialog } from './GradeFormDialog'
import { useDeleteGrade, useGrades } from './hooks'

const helper = columnHelper<Grade>()

export function GradesPage() {
  const { can } = useAuth()
  const grades = useGrades()
  const remove = useDeleteGrade()
  const [editing, setEditing] = useState<Grade | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Grade | undefined>()

  const canWrite = can('grades.write')
  const canDelete = can('grades.delete')

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('code', {
          header: 'Code',
          cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        }),
        helper.accessor('scheme', { header: 'Scheme' }),
        helper.accessor('level', { header: 'Level' }),
        helper.accessor('title', { header: 'Title' }),
        helper.display({
          id: 'actions',
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              {canWrite && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit grade ${row.original.code}`}
                  onClick={() => {
                    setEditing(row.original)
                    setFormOpen(true)
                  }}
                >
                  <PencilIcon />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete grade ${row.original.code}`}
                  onClick={() => setDeleting(row.original)}
                >
                  <Trash2Icon />
                </Button>
              )}
            </div>
          ),
        }),
      ]),
    [canWrite, canDelete],
  )

  const sorted = useMemo(
    () =>
      [...(grades.data ?? [])].sort(
        (a, b) => a.scheme.localeCompare(b.scheme) || a.level - b.level,
      ),
    [grades.data],
  )

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success(`Grade ${deleting.code} deleted`)
    } catch (error) {
      toastError(error, `Could not delete grade ${deleting.code}`)
    } finally {
      setDeleting(undefined)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Perkhidmatan"
        title="Grades"
        description="Service grades (gred) by scheme and level."
        actions={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              <PlusIcon aria-hidden="true" />
              New grade
            </Button>
          )
        }
      />

      {grades.isPending ? (
        <LoadingState />
      ) : grades.isError ? (
        <ErrorState error={grades.error} onRetry={() => void grades.refetch()} />
      ) : (
        <DataTable
          caption="Grades"
          columns={columns}
          data={sorted}
          empty={
            <EmptyState
              title="No grades yet"
              description="Grades must exist before employees can be added."
            />
          }
        />
      )}

      <GradeFormDialog open={formOpen} onOpenChange={setFormOpen} grade={editing} />
      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete grade ${deleting?.code ?? ''}?`}
        description="A grade that is still used by employees, service records or applications cannot be deleted."
        confirmLabel="Delete grade"
        destructive
        pending={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
