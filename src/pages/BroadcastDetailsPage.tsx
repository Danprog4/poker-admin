import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'

export function BroadcastDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const broadcastId = Number(id)

  const { state, countBroadcastRecipients, updateBroadcast, sendBroadcast } = useAdminData()

  const broadcast = state.broadcasts.find((item) => item.id === broadcastId)
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [draftMessage, setDraftMessage] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notice])

  const recipients = useMemo(() => {
    if (!broadcast) {
      return 0
    }

    return countBroadcastRecipients(
      broadcast.targetFilter,
      broadcast.targetSeriesId,
      broadcast.targetTournamentId,
      broadcast.targetUserIds,
    )
  }, [broadcast, countBroadcastRecipients])

  if (!broadcast) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--text-muted)]">
        Рассылка не найдена
      </div>
    )
  }

  const editable = broadcast.status === 'draft'
  const currentMessage = editable && isDirty ? draftMessage : broadcast.message

  const handleSave = async () => {
    if (!editable || !isDirty || isSaving) {
      return
    }

    if (!currentMessage.trim()) {
      setNotice({ text: 'Сообщение не может быть пустым', type: 'error' })
      return
    }

    setIsSaving(true)
    const saved = await updateBroadcast(broadcast.id, { message: currentMessage.trim() })
    setIsSaving(false)

    if (!saved) {
      setNotice({ text: 'Не удалось сохранить черновик', type: 'error' })
      return
    }

    setIsDirty(false)
    setNotice({ text: 'Черновик сохранён', type: 'success' })
  }

  const handleSend = async () => {
    if (isSending || isSaving) {
      return
    }

    if (!currentMessage.trim()) {
      setNotice({ text: 'Сообщение не может быть пустым', type: 'error' })
      return
    }

    if (editable && isDirty) {
      const saved = await updateBroadcast(broadcast.id, { message: currentMessage.trim() })

      if (!saved) {
        setNotice({ text: 'Не удалось сохранить изменения перед отправкой', type: 'error' })
        return
      }

      setIsDirty(false)
    }

    setIsSending(true)
    const sent = await sendBroadcast(broadcast.id)
    setIsSending(false)

    if (!sent) {
      setNotice({ text: 'Не удалось отправить рассылку', type: 'error' })
      return
    }

    setOpenConfirm(false)
    setNotice({ text: 'Рассылка отправлена', type: 'success' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link to="/broadcasts" className="hover:text-[var(--accent)]">Рассылки</Link>
        <span>/</span>
        <span className="text-[var(--text-primary)]">#{broadcast.id}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Рассылка #{broadcast.id}</h1>
        <StatusBadge status={broadcast.status} />
      </div>

      <section className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <FormField
          as="textarea"
          label="Сообщение"
          textareaProps={{
            rows: 8,
            value: currentMessage,
            readOnly: !editable,
            onChange: (event) => {
              if (!editable) {
                return
              }

              setDraftMessage(event.target.value)
              if (!isDirty) {
                setIsDirty(true)
              }
            },
          }}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            label="Фильтр"
            inputProps={{ value: broadcast.targetFilter, readOnly: true }}
          />
          <FormField
            label="Получателей"
            inputProps={{ value: String(recipients), readOnly: true }}
          />
          <FormField
            label="Создана"
            inputProps={{ value: formatDateTime(broadcast.createdAt), readOnly: true }}
          />
          <FormField
            label="Отправлена"
            inputProps={{ value: broadcast.sentAt ? formatDateTime(broadcast.sentAt) : '—', readOnly: true }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {editable ? (
            <>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!isDirty || isSaving || isSending}
                className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Сохраняем...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={() => setOpenConfirm(true)}
                disabled={isSaving || isSending}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? 'Отправляем...' : 'Отправить'}
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => navigate('/broadcasts')}
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
          >
            Назад к списку
          </button>
        </div>
      </section>

      {notice ? (
        <div
          className={`rounded-xl border p-3 text-sm ${
            notice.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <ConfirmDialog
        open={openConfirm}
        title="Отправить рассылку?"
        description={`Сообщение получат ${recipients} человек. Это действие нельзя отменить.`}
        confirmLabel="Да, отправить"
        confirmPendingLabel="Отправляем..."
        pending={isSending}
        onClose={() => setOpenConfirm(false)}
        onConfirm={() => void handleSend()}
      />
    </div>
  )
}
