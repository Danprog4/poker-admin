import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { BroadcastPreview } from '../components/BroadcastPreview'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormField } from '../components/FormField'
import type { BroadcastTargetFilter } from '../lib/admin-models'
import { useAdminData } from '../providers/useAdminData'

export function BroadcastNewPage() {
  const navigate = useNavigate()
  const { state, createBroadcast, sendBroadcast, countBroadcastRecipients } = useAdminData()

  const [message, setMessage] = useState('')
  const [targetFilter, setTargetFilter] = useState<BroadcastTargetFilter>('all')
  const [targetSeriesId, setTargetSeriesId] = useState('none')
  const [targetTournamentId, setTargetTournamentId] = useState('none')
  const [openConfirm, setOpenConfirm] = useState(false)
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notice])

  const recipientsCount = useMemo(
    () =>
      countBroadcastRecipients(
        targetFilter,
        targetSeriesId === 'none' ? null : Number(targetSeriesId),
        targetTournamentId === 'none' ? null : Number(targetTournamentId),
      ),
    [countBroadcastRecipients, targetFilter, targetSeriesId, targetTournamentId],
  )

  const handleCreateDraft = async () => {
    if (isSavingDraft) {
      return
    }

    if (!message.trim()) {
      setNotice({ text: 'Сообщение не может быть пустым', type: 'error' })
      return
    }

    setIsSavingDraft(true)
    const createdId = await createBroadcast({
      message: message.trim(),
      targetFilter,
      targetUserIds: null,
      targetSeriesId: targetSeriesId === 'none' ? null : Number(targetSeriesId),
      targetTournamentId:
        targetTournamentId === 'none' ? null : Number(targetTournamentId),
    })
    setIsSavingDraft(false)

    if (!createdId) {
      setNotice({ text: 'Не удалось создать черновик', type: 'error' })
      return
    }

    navigate(`/broadcasts/${createdId}`)
  }

  const handleSend = async () => {
    if (isSending) {
      return
    }

    if (!message.trim()) {
      setNotice({ text: 'Сообщение не может быть пустым', type: 'error' })
      return
    }

    setIsSending(true)
    const createdId = await createBroadcast({
      message: message.trim(),
      targetFilter,
      targetUserIds: null,
      targetSeriesId: targetSeriesId === 'none' ? null : Number(targetSeriesId),
      targetTournamentId:
        targetTournamentId === 'none' ? null : Number(targetTournamentId),
    })

    if (!createdId) {
      setNotice({ text: 'Не удалось создать рассылку', type: 'error' })
      setIsSending(false)
      return
    }

    const sent = await sendBroadcast(createdId)
    setIsSending(false)

    if (!sent) {
      setNotice({ text: 'Не удалось отправить рассылку', type: 'error' })
      return
    }

    setOpenConfirm(false)
    navigate(`/broadcasts/${createdId}`)
  }

  return (
    <div className="space-y-4">
      <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Новая рассылка</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <FormField
            as="textarea"
            label="Текст сообщения"
            textareaProps={{
              rows: 10,
              value: message,
              onChange: (event) => setMessage(event.target.value),
              placeholder: 'Введите текст рассылки...',
            }}
          />

          <FormField
            as="select"
            label="Фильтр получателей"
            options={[
              { value: 'all', label: 'Все юзеры' },
              { value: 'registered', label: 'Записанные на турнир' },
              { value: 'series', label: 'Участники серии' },
            ]}
            selectProps={{
              value: targetFilter,
              onChange: (event) => setTargetFilter(event.target.value as BroadcastTargetFilter),
            }}
          />

          {targetFilter === 'series' ? (
            <FormField
              as="select"
              label="Серия"
              options={[
                { value: 'none', label: 'Выбери серию' },
                ...state.series.map((item) => ({ value: String(item.id), label: item.name })),
              ]}
              selectProps={{
                value: targetSeriesId,
                onChange: (event) => setTargetSeriesId(event.target.value),
              }}
            />
          ) : null}

          {targetFilter === 'registered' ? (
            <FormField
              as="select"
              label="Турнир"
              options={[
                { value: 'none', label: 'Выбери турнир' },
                ...state.tournaments.map((item) => ({
                  value: String(item.id),
                  label: item.name,
                })),
              ]}
              selectProps={{
                value: targetTournamentId,
                onChange: (event) => setTargetTournamentId(event.target.value),
              }}
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpenConfirm(true)}
              disabled={isSending || isSavingDraft}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? 'Отправляем...' : 'Отправить'}
            </button>
            <button
              type="button"
              onClick={() => void handleCreateDraft()}
              disabled={isSavingDraft || isSending}
              className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingDraft ? 'Сохраняем...' : 'Сохранить черновик'}
            </button>
          </div>
        </section>

        <BroadcastPreview message={message} recipientsCount={recipientsCount} />
      </div>

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
        description={`Сообщение получат ${recipientsCount} человек. Это действие нельзя отменить.`}
        confirmLabel="Да, отправить"
        confirmPendingLabel="Отправляем..."
        pending={isSending}
        onClose={() => setOpenConfirm(false)}
        onConfirm={() => void handleSend()}
      />
    </div>
  )
}
