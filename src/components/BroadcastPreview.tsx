type BroadcastPreviewProps = {
  message: string
  imageUrl?: string | null
  recipientsCount: number
}

export function BroadcastPreview({
  message,
  imageUrl,
  recipientsCount,
}: BroadcastPreviewProps) {
  return (
    <section className="space-y-2 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Превью рассылки</p>
      {imageUrl ? (
        <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
          <img src={imageUrl} alt="Превью картинки рассылки" className="h-44 w-full object-cover" />
        </div>
      ) : null}
      <div className="rounded-lg border border-[var(--line)] bg-gray-50 p-4">
        {message.trim() ? (
          <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{message}</p>
        ) : (
          <p className="text-sm text-[var(--text-muted)] italic">Текст сообщения пока пуст</p>
        )}
      </div>
      <p className="text-sm text-[var(--text-muted)]">Получателей: <span className="font-semibold text-[var(--text-primary)]">{recipientsCount}</span></p>
    </section>
  )
}
