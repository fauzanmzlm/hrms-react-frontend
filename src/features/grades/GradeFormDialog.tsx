import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { applyApiErrorToForm } from '@/lib/api/errors'
import type { Grade } from '@/lib/api/types'
import { useCreateGrade, useUpdateGrade } from './hooks'
import { gradeSchema, type GradeFormValues } from './schema'

interface GradeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edits this grade; creates a new one when undefined. */
  grade?: Grade
}

function defaults(grade?: Grade): GradeFormValues {
  return {
    code: grade?.code ?? '',
    scheme: grade?.scheme ?? '',
    level: grade ? String(grade.level) : '',
    title: grade?.title ?? '',
  }
}

export function GradeFormDialog({ open, onOpenChange, grade }: GradeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Remounting the form on open resets it to the grade being edited. */}
        {open && <GradeForm grade={grade} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function GradeForm({ grade, onDone }: { grade?: Grade; onDone: () => void }) {
  const create = useCreateGrade()
  const update = useUpdateGrade(grade?.id ?? 0)
  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: defaults(grade),
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = grade ? await update.mutateAsync(values) : await create.mutateAsync(values)
      toast.success(grade ? `Grade ${saved.code} updated` : `Grade ${saved.code} created`)
      onDone()
    } catch (error) {
      applyApiErrorToForm(error, form)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>{grade ? `Edit grade ${grade.code}` : 'New grade'}</DialogTitle>
        <DialogDescription>
          The level decides promotion order: a promotion must move to a higher level.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="my-4">
        <FormRootError error={form.formState.errors.root?.server} />
        <div className="grid grid-cols-2 gap-4">
          <TextField control={form.control} name="code" label="Code" placeholder="N41" required />
          <TextField control={form.control} name="scheme" label="Scheme" placeholder="N" required />
        </div>
        <TextField
          control={form.control}
          name="level"
          label="Level"
          type="number"
          inputMode="numeric"
          min={1}
          required
        />
        <TextField control={form.control} name="title" label="Title" required />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : 'Save grade'}
        </Button>
      </DialogFooter>
    </form>
  )
}
