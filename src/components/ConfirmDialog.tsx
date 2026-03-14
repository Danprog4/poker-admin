type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  confirmPendingLabel?: string
  cancelLabel?: string
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  confirmPendingLabel,
  cancelLabel = 'Отмена',
  pending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-gray-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[var(--line)] bg-white p-6 shadow-2xl">
        <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[var(--text-primary)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-lg bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? confirmPendingLabel ?? `${confirmLabel}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
