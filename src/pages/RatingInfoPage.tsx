import { useEffect, useMemo, useState } from 'react'

import { FormField } from '../components/FormField'
import { trpc } from '../lib/trpc'
import { useToast } from '../providers/ToastProvider'

function getUpdatedAtLabel(value: unknown) {
  if (!value) {
    return 'Не обновлялось'
  }

  const date = new Date(value as string | number | Date)

  if (Number.isNaN(date.getTime())) {
    return 'Не обновлялось'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(date)
}

export function RatingInfoPage() {
  const { success, error } = useToast()
  const ratingInfoQuery = trpc.admin.faq.getRatingInfo.useQuery()
  const updateRatingInfoMutation = trpc.admin.faq.updateRatingInfo.useMutation()
  const [text, setText] = useState('')
  const [isPublished, setIsPublished] = useState(true)

  useEffect(() => {
    if (!ratingInfoQuery.data) {
      return
    }

    setText(ratingInfoQuery.data.text ?? '')
    setIsPublished(ratingInfoQuery.data.isPublished ?? true)
  }, [ratingInfoQuery.data])

  const preview = useMemo(() => {
    const normalized = text.replace(/\s+/g, ' ').trim()

    if (!normalized) {
      return 'Текст пока не задан'
    }

    if (normalized.length <= 140) {
      return normalized
    }

    return `${normalized.slice(0, 140)}...`
  }, [text])

  const handleSave = async () => {
    try {
      await updateRatingInfoMutation.mutateAsync({
        text,
        isPublished,
      })
      await ratingInfoQuery.refetch()
      success('Изменения применены')
    } catch (cause) {
      console.error(cause)
      error('Не удалось сохранить текст рейтинга')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Что такое рейтинг?</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Отдельный текст для экрана объяснения рейтинга в приложении.
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--line)] text-sm">
            <thead className="bg-[var(--bg-muted)]/70 text-left text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Раздел</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Обновлено</th>
                <th className="px-4 py-3 font-medium">Превью</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              <tr className="bg-white">
                <td className="px-4 py-4 font-medium text-[var(--text-primary)]">
                  Что такое рейтинг?
                </td>
                <td className="px-4 py-4 text-[var(--text-primary)]">
                  {isPublished ? 'Опубликован' : 'Скрыт'}
                </td>
                <td className="px-4 py-4 text-[var(--text-muted)]">
                  {getUpdatedAtLabel(ratingInfoQuery.data?.updatedAt)}
                </td>
                <td className="px-4 py-4 text-[var(--text-muted)]">{preview}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <FormField
          as="textarea"
          label="Текст"
          textareaProps={{
            value: text,
            onChange: (event) => setText(event.target.value),
            rows: 16,
            placeholder: 'Введи текст, который будет показан в приложении',
          }}
        />

        <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-gray-50/70 px-4 py-3 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) => setIsPublished(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          Показывать текст в приложении
        </label>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={updateRatingInfoMutation.isPending}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updateRatingInfoMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </section>
    </div>
  )
}
