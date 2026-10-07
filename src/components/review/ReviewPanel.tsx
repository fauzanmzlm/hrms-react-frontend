import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2Icon, InfoIcon, XCircleIcon } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TextareaField, TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field'
import { isApiError } from '@/lib/api/client'
import { applyApiErrorToForm } from '@/lib/api/errors'
import { cn } from '@/lib/utils'
import { reviewSchema, type ReviewFormValues } from './schema'

interface ReviewPanelProps {
  /** e.g. "promotion application"; used in headings and messages. */
  itemLabel: string
  /** When set, the signed-in reviewer may not review this item and no form is shown. */
  blockedReason?: string
  requireEffectiveDate?: boolean
  effectiveDateHint?: ReactNode
  /** Earliest allowed effective date ("YYYY-MM-DD"), as a hint for the date picker. */
  effectiveDateMin?: string
  /** Extra warning shown when confirming an approval. */
  approveWarning?: ReactNode
  /** Sends the review; rejects with the API error. */
  onSubmit: (values: ReviewFormValues) => Promise<unknown>
}

const DEFAULTS: ReviewFormValues = { decision: '', remarks: '', effective_date: '' }

export function ReviewPanel({
  itemLabel,
  blockedReason,
  requireEffectiveDate = false,
  effectiveDateHint,
  effectiveDateMin,
  approveWarning,
  onSubmit,
}: ReviewPanelProps) {
  const schema = useMemo(() => reviewSchema(requireEffectiveDate), [requireEffectiveDate])
  const form = useForm<ReviewFormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })
  const decision = useWatch({ control: form.control, name: 'decision' })
  const [confirming, setConfirming] = useState<ReviewFormValues | null>(null)
  const [sending, setSending] = useState(false)
  const decisionErrorId = useId()

  if (blockedReason) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Review</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertTitle>You cannot review this {itemLabel}</AlertTitle>
            <AlertDescription>{blockedReason}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const requestConfirm = form.handleSubmit((values) => setConfirming(values))

  async function send() {
    if (!confirming) return
    setSending(true)
    try {
      await onSubmit(confirming)
      toast.success(
        confirming.decision === 'APPROVED'
          ? `The ${itemLabel} was approved`
          : `The ${itemLabel} was rejected`,
      )
      form.reset(DEFAULTS)
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        // Someone else reviewed it first; the item is refetched and shows its new status.
        toast.info(`This ${itemLabel} has already been reviewed. Showing its latest status.`)
      } else {
        applyApiErrorToForm(error, form)
      }
    } finally {
      setSending(false)
      setConfirming(null)
    }
  }

  const decisionError = form.formState.errors.decision?.message
  const approving = confirming?.decision === 'APPROVED'

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Review</h2>
        </CardTitle>
        <CardDescription>Approving or rejecting is final and cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={requestConfirm} noValidate aria-label={`Review ${itemLabel}`}>
          <FieldGroup>
            <FormRootError error={form.formState.errors.root?.server} />
            <FieldSet aria-describedby={decisionError ? decisionErrorId : undefined}>
              <FieldLegend variant="label">Decision</FieldLegend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    {
                      value: 'APPROVED',
                      label: 'Approve',
                      Icon: CheckCircle2Icon,
                      tone: 'has-checked:border-emerald-600 has-checked:bg-emerald-50',
                    },
                    {
                      value: 'REJECTED',
                      label: 'Reject',
                      Icon: XCircleIcon,
                      tone: 'has-checked:border-red-600 has-checked:bg-red-50',
                    },
                  ] as const
                ).map(({ value, label, Icon, tone }) => (
                  <label
                    key={value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                      tone,
                    )}
                  >
                    <input
                      type="radio"
                      value={value}
                      className="size-4 accent-current"
                      {...form.register('decision')}
                    />
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </label>
                ))}
              </div>
              {decisionError && <FieldError id={decisionErrorId}>{decisionError}</FieldError>}
            </FieldSet>

            {requireEffectiveDate && decision === 'APPROVED' && (
              <TextField
                control={form.control}
                name="effective_date"
                label="Effective date"
                type="date"
                min={effectiveDateMin}
                description={effectiveDateHint}
                required
              />
            )}
            <TextareaField
              control={form.control}
              name="remarks"
              label={decision === 'REJECTED' ? 'Remarks' : 'Remarks (optional)'}
              description={decision === 'REJECTED' ? 'Explain why it is rejected.' : undefined}
              required={decision === 'REJECTED'}
              rows={3}
            />
            <div>
              <Button type="submit" disabled={sending}>
                Submit review
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={approving ? `Approve this ${itemLabel}?` : `Reject this ${itemLabel}?`}
        description={
          <div className="flex flex-col gap-2">
            <p>This decision is final.</p>
            {approving && approveWarning}
            {confirming?.remarks && (
              <p>
                <span className="font-medium text-foreground">Remarks:</span> {confirming.remarks}
              </p>
            )}
          </div>
        }
        confirmLabel={approving ? 'Approve' : 'Reject'}
        destructive={!approving}
        pending={sending}
        onConfirm={() => void send()}
      />
    </Card>
  )
}
