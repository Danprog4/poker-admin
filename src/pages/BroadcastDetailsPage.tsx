import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { BroadcastPreview } from '../components/BroadcastPreview'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../lib/date'
import { fileToDataUrl } from '../lib/imageUpload'
import { useToast } from '../providers/ToastProvider'
import { useAdminData } from '../providers/useAdminData'

export function BroadcastDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const broadcastId = Number(id)

  const { state, countBroadcastRecipients, updateBroadcast, sendBroadcast } = useAdminData()
  const { success, error } = useToast()

  const broadcast = state.broadcasts.find((item) => item.id === broadcastId)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [draftMessage, setDraftMessage] = useState('')
  const [draftImageDataUrl, setDraftImageDataUrl] = useState<string | null>(null)
  const [isMessageDirty, setIsMessageDirty] = useState(false)
  const [isImageDirty, setIsImageDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    setDraftMessage(broadcast?.message ?? '')
    setDraftImageDataUrl(null)
    setIsMessageDirty(false)
    setIsImageDirty(false)
  }, [broadcast?.id, broadcast?.message, broadcast?.imageUrl])

  if (!broadcast) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--text-muted)]">
        Рассылка не найдена
      </div>
    )
  }

  const editable = broadcast.status === 'draft'
  const isDirty = isMessageDirty || isImageDirty
  const currentMessage =
    editable && isMessageDirty ? draftMessage : broadcast.message
  const currentImageUrl =
    editable && isImageDirty ? draftImageDataUrl : broadcast.imageUrl

  const handleSave = async () => {
    if (!editable || !isDirty || isSaving) {
      return
    }

    if (!currentMessage.trim()) {
      error('Сообщение не может быть пустым')
      return
    }

    setIsSaving(true)
    const saved = await updateBroadcast(broadcast.id, {
      ...(isMessageDirty ? { message: currentMessage.trim() } : {}),
      ...(isImageDirty ? { imageUrl: currentImageUrl } : {}),
    })
    setIsSaving(false)

    if (!saved) {
      error('Не удалось сохранить черновик')
      return
    }

    setIsMessageDirty(false)
    setIsImageDirty(false)
    success('Черновик сохранён')
  }

  const handleSend = async () => {
    if (isSending || isSaving) {
      return
    }

    if (!currentMessage.trim()) {
      error('Сообщение не может быть пустым')
      return
    }

    if (editable && isDirty) {
      const saved = await updateBroadcast(broadcast.id, {
        ...(isMessageDirty ? { message: currentMessage.trim() } : {}),
        ...(isImageDirty ? { imageUrl: currentImageUrl } : {}),
      })

      if (!saved) {
        error('Не удалось сохранить изменения перед отправкой')
        return
      }

      setIsMessageDirty(false)
      setIsImageDirty(false)
    }

    setIsSending(true)
    const sent = await sendBroadcast(broadcast.id)
    setIsSending(false)

    if (!sent) {
      error('Не удалось отправить рассылку')
      return
    }

    setOpenConfirm(false)
    success('Рассылка отправлена')
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file || !editable) {
      return
    }

    setIsImageLoading(true)

    try {
      const dataUrl = await fileToDataUrl(file)
      setDraftImageDataUrl(dataUrl)
      setIsImageDirty(true)
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
              setIsMessageDirty(true)
            },
          }}
        />

        <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--bg-surface-muted)] p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Картинка</p>
            <p className="text-sm text-[var(--text-muted)]">
              Опционально. Если картинка добавлена, Telegram отправит фото с текстом в подписи.
            </p>
          </div>

          {editable ? (
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
              {currentImageUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraftImageDataUrl(null)
                    setIsImageDirty(true)
                  }}
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
                >
                  Очистить
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <BroadcastPreview
          message={currentMessage}
          imageUrl={currentImageUrl}
          recipientsCount={recipients}
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
