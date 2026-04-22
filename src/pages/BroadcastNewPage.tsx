import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { BroadcastPreview } from '../components/BroadcastPreview'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormField } from '../components/FormField'
import type { BroadcastTargetFilter } from '../lib/admin-models'
import { fileToDataUrl } from '../lib/imageUpload'
import { useToast } from '../providers/ToastProvider'
import { useAdminData } from '../providers/useAdminData'

export function BroadcastNewPage() {
  const navigate = useNavigate()
  const { state, createBroadcast, sendBroadcast, countBroadcastRecipients } = useAdminData()
  const { error, success } = useToast()

  const [message, setMessage] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [targetFilter, setTargetFilter] = useState<BroadcastTargetFilter>('all')
  const [targetSeriesId, setTargetSeriesId] = useState('none')
  const [targetTournamentId, setTargetTournamentId] = useState('none')
  const [openConfirm, setOpenConfirm] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const finalImageUrl = imageDataUrl

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
      error('Сообщение не может быть пустым')
      return
    }

    setIsSavingDraft(true)
    const createdId = await createBroadcast({
      message: message.trim(),
      imageUrl: finalImageUrl,
      targetFilter,
      targetUserIds: null,
      targetSeriesId: targetSeriesId === 'none' ? null : Number(targetSeriesId),
      targetTournamentId:
        targetTournamentId === 'none' ? null : Number(targetTournamentId),
    })
    setIsSavingDraft(false)

    if (!createdId) {
      error('Не удалось создать черновик')
      return
    }

    success('Черновик сохранён')
    navigate(`/broadcasts/${createdId}`)
  }

  const handleSend = async () => {
    if (isSending) {
      return
    }

    if (!message.trim()) {
      error('Сообщение не может быть пустым')
      return
    }

    setIsSending(true)
    const createdId = await createBroadcast({
      message: message.trim(),
      imageUrl: finalImageUrl,
      targetFilter,
      targetUserIds: null,
      targetSeriesId: targetSeriesId === 'none' ? null : Number(targetSeriesId),
      targetTournamentId:
        targetTournamentId === 'none' ? null : Number(targetTournamentId),
    })

    if (!createdId) {
      error('Не удалось создать рассылку')
      setIsSending(false)
      return
    }

    const sent = await sendBroadcast(createdId)
    setIsSending(false)

    if (!sent) {
      error('Не удалось отправить рассылку')
      return
    }

    setOpenConfirm(false)
    success('Рассылка отправлена')
    navigate(`/broadcasts/${createdId}`)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsImageLoading(true)

    try {
      const dataUrl = await fileToDataUrl(file)
      setImageDataUrl(dataUrl)
    } catch {
      error('Не удалось обработать картинку')
    } finally {
      setIsImageLoading(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
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

          <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--bg-surface-muted)] p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Картинка</p>
              <p className="text-sm text-[var(--text-muted)]">
                Опционально. Если добавить картинку, Telegram отправит фото с текстом в подписи.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImageLoading}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isImageLoading ? 'Загрузка...' : 'Загрузить картинку'}
              </button>
              {finalImageUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setImageDataUrl(null)
                  }}
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
                >
                  Очистить
                </button>
              ) : null}
            </div>
          </div>

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

        <BroadcastPreview
          message={message}
          imageUrl={finalImageUrl}
          recipientsCount={recipientsCount}
        />
      </div>
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
