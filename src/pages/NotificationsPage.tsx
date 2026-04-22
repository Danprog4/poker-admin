import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import { FormField } from '../components/FormField'
import { fileToDataUrl } from '../lib/imageUpload'
import { trpc } from '../lib/trpc'
import { useAdminData } from '../providers/useAdminData'
import { useToast } from '../providers/ToastProvider'

type NotificationCategory = 'operational' | 'gamification' | 'statistics'
type NotificationTriggerType = 'event' | 'cron' | 'manual'

type NotificationFlow = {
  id: number
  slug: string
  name: string
  category: NotificationCategory
  triggerType: NotificationTriggerType
  eventName: string | null
  cronExpression: string | null
  isEnabled: boolean
  maxPerDay: number
  triggerConfig: Record<string, unknown>
}

type NotificationTemplate = {
  id: number
  flowId: number
  version: number
  isActive: boolean
  title: string | null
  body: string
  parseMode: 'MarkdownV2' | 'HTML' | null
  variables: string[]
  imageUrl: string | null
  buttonText: string | null
  buttonUrl: string | null
  createdAt: Date | string | null
}

type TemplateDraft = {
  title: string
  body: string
  imageUrl: string
  imageDataUrl: string | null
}

const VARIABLE_HINTS: Record<string, string> = {
  tournament_name: 'название турнира',
  tournament_date: 'дата и время турнира',
  tournament_address: 'адрес турнира',
  tournament_location_hint: 'подсказка по адресу',
  user_name: 'имя пользователя',
  rank: 'место в рейтинге',
  rank_delta: 'изменение позиции',
  rank_month: 'место за месяц',
  points: 'количество очков',
  points_delta: 'изменение очков',
  points_to_top27: 'сколько очков осталось до топ-27',
  tournaments_count: 'число турниров',
  wins: 'число побед',
  message: 'текст, который вводится вручную',
}

const EMPTY_TEMPLATE_DRAFT: TemplateDraft = {
  title: '',
  body: '',
  imageUrl: '',
  imageDataUrl: null,
}

const TRIGGER_TYPE_HINTS: Record<NotificationTriggerType, string> = {
  cron: 'Cron: уведомление уходит автоматически по расписанию. Важно не ломать текст и переменные, потому что оно отправляется без участия админа.',
  event: 'Event: уведомление уходит, когда на бэке происходит конкретное событие, например регистрация или изменение рейтинга.',
  manual: 'Manual: этот flow используется только при ручной отправке из CRM.',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

function getTriggerLabel(flow: NotificationFlow) {
  if (flow.triggerType === 'event') {
    return 'event'
  }

  if (flow.triggerType === 'cron') {
    return 'cron'
  }

  return 'manual'
}

function getTriggerDetails(flow: NotificationFlow) {
  if (flow.triggerType === 'event') {
    return flow.eventName ? `Событие: ${flow.eventName}` : 'Событие без имени'
  }

  if (flow.triggerType === 'cron') {
    return flow.cronExpression ? `Расписание: ${flow.cronExpression}` : 'Cron без расписания'
  }

  return 'Ручная отправка из CRM'
}

function toTemplateDraft(template: NotificationTemplate | null): TemplateDraft {
  return {
    title: template?.title ?? '',
    body: template?.body ?? '',
    imageUrl: template?.imageUrl ?? '',
    imageDataUrl: null,
  }
}

function NotificationFlowEditor({
  flow,
  onRunCron,
}: {
  flow: NotificationFlow
  onRunCron: (flow: NotificationFlow) => void
}) {
  const utils = trpc.useUtils()
  const { error, success } = useToast()
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(EMPTY_TEMPLATE_DRAFT)
  const [isTemplateDirty, setIsTemplateDirty] = useState(false)
  const [isTemplateImageLoading, setIsTemplateImageLoading] = useState(false)
  const templateFileInputRef = useRef<HTMLInputElement>(null)

  const templatesQuery = trpc.admin.notifications.templates.list.useQuery(
    { flowId: flow.id },
    { staleTime: 0, refetchOnMount: 'always' },
  )

  const templates = useMemo(
    () => (templatesQuery.data ?? []) as NotificationTemplate[],
    [templatesQuery.data],
  )

  const activeTemplate = useMemo(
    () => templates.find((template) => template.isActive) ?? templates[0] ?? null,
    [templates],
  )

  const activeVariables = useMemo(
    () => activeTemplate?.variables ?? [],
    [activeTemplate],
  )

  useEffect(() => {
    setTemplateDraft(toTemplateDraft(activeTemplate))
    setIsTemplateDirty(false)
  }, [activeTemplate, flow.id])

  const createTemplateMutation =
    trpc.admin.notifications.templates.createVersion.useMutation({
      onSuccess: async () => {
        await Promise.all([
          templatesQuery.refetch(),
          utils.admin.notifications.flows.list.invalidate(),
        ])
        success('Изменения применены')
      },
      onError: (mutationError: unknown) => {
        error(getErrorMessage(mutationError, 'Не удалось сохранить шаблон'))
      },
    })

  const setTemplateField = <K extends keyof TemplateDraft>(
    key: K,
    value: TemplateDraft[K],
  ) => {
    setTemplateDraft((current) => ({ ...current, [key]: value }))
    setIsTemplateDirty(true)
  }

  const copyVariable = async (variable: string) => {
    try {
      await navigator.clipboard.writeText(`{${variable}}`)
      success(`Скопировано: {${variable}}`)
    } catch {
      error('Не удалось скопировать переменную')
    }
  }

  const handleTemplateFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsTemplateImageLoading(true)

    try {
      const dataUrl = await fileToDataUrl(file)
      setTemplateDraft((current) => ({
        ...current,
        imageDataUrl: dataUrl,
        imageUrl: '',
      }))
      setIsTemplateDirty(true)
    } catch {
      error('Не удалось обработать картинку')
    } finally {
      setIsTemplateImageLoading(false)

      if (templateFileInputRef.current) {
        templateFileInputRef.current.value = ''
      }
    }
  }

  const handleResetTemplate = () => {
    setTemplateDraft(toTemplateDraft(activeTemplate))
    setIsTemplateDirty(false)
  }

  const handleSaveTemplate = () => {
    if (!templateDraft.body.trim()) {
      error('Заполни текст уведомления')
      return
    }

    const imageUrl =
      templateDraft.imageDataUrl ??
      (templateDraft.imageUrl.trim() ? templateDraft.imageUrl.trim() : null)

    createTemplateMutation.mutate({
      flowId: flow.id,
      title: templateDraft.title.trim() || null,
      body: templateDraft.body.trim(),
      parseMode: activeTemplate?.parseMode ?? null,
      variables: activeTemplate?.variables ?? [],
      imageUrl,
      buttonText: activeTemplate?.buttonText ?? null,
      buttonUrl: activeTemplate?.buttonUrl ?? null,
      activate: true,
    })
  }

  const previewImage =
    templateDraft.imageDataUrl ??
    (templateDraft.imageUrl.trim() ? templateDraft.imageUrl.trim() : null)

  return (
    <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">{flow.name}</h2>
          <p className="text-sm text-[var(--text-muted)]">{getTriggerDetails(flow)}</p>
          <p className="text-xs text-[var(--text-muted)]">
            Slug: <span className="font-mono">{flow.slug}</span>
          </p>
        </div>

        {flow.triggerType === 'cron' ? (
          <button
            type="button"
            onClick={() => onRunCron(flow)}
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
          >
            Прогнать cron
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <FormField
            label="Заголовок (опционально)"
            inputProps={{
              value: templateDraft.title,
              onChange: (event) => setTemplateField('title', event.target.value),
              placeholder: 'Регистрация на турнир',
            }}
          />

          <FormField
            as="textarea"
            label="Тело шаблона"
            textareaProps={{
              rows: 8,
              value: templateDraft.body,
              onChange: (event) => setTemplateField('body', event.target.value),
              placeholder: 'Готово! Вы зарегистрированы на турнир: {tournament_name}',
            }}
          />

          <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--bg-surface-muted)] p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Картинка для уведомления</p>
              <p className="text-sm text-[var(--text-muted)]">
                Опционально. Если картинка добавлена, в Telegram уйдет фото с подписью вместо обычного сообщения.
              </p>
            </div>

            <FormField
              label="Image URL"
              inputProps={{
                value: templateDraft.imageUrl,
                onChange: (event) => {
                  setTemplateField('imageUrl', event.target.value)
                  if (templateDraft.imageDataUrl) {
                    setTemplateField('imageDataUrl', null)
                  }
                },
                placeholder: 'https://...',
              }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={templateFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleTemplateFileChange}
              />
              <button
                type="button"
                onClick={() => templateFileInputRef.current?.click()}
                disabled={isTemplateImageLoading}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTemplateImageLoading ? 'Загрузка...' : 'Загрузить картинку'}
              </button>
              {previewImage ? (
                <button
                  type="button"
                  onClick={() => {
                    setTemplateDraft((current) => ({
                      ...current,
                      imageUrl: '',
                      imageDataUrl: null,
                    }))
                    setIsTemplateDirty(true)
                  }}
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
                >
                  Очистить
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={createTemplateMutation.isPending || !isTemplateDirty}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createTemplateMutation.isPending ? 'Сохраняем...' : 'Сохранить флоу'}
            </button>
            <button
              type="button"
              onClick={handleResetTemplate}
              className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
            >
              Сбросить
            </button>
          </div>
        </div>

        <div className="space-y-4 border-l border-[var(--line)] pl-4">
          {previewImage ? (
            <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
              <img src={previewImage} alt="Превью уведомления" className="h-44 w-full object-cover" />
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Подсказки</h3>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-surface-muted)] px-3 py-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Тип триггера: {getTriggerLabel(flow)}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{TRIGGER_TYPE_HINTS[flow.triggerType]}</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{getTriggerDetails(flow)}</p>
            </div>

            {activeVariables.length > 0 ? (
              <div className="space-y-2">
                {activeVariables.map((variable) => (
                  <div
                    key={variable}
                    className="rounded-lg border border-[var(--line)] bg-[var(--bg-surface-muted)] px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <code className="text-sm text-[var(--text-primary)]">{`{${variable}}`}</code>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {VARIABLE_HINTS[variable] ?? 'переменная из этого flow'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyVariable(variable)}
                        className="shrink-0 rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] transition hover:bg-gray-50"
                      >
                        Скопировать
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Для этого flow переменных сейчас нет.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export function NotificationsPage() {
  const { error, success } = useToast()
  const { state, countBroadcastRecipients, createBroadcast, sendBroadcast } =
    useAdminData()

  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null)
  const [manualMessage, setManualMessage] = useState('')
  const [manualImageDataUrl, setManualImageDataUrl] = useState<string | null>(null)
  const [manualAudience, setManualAudience] = useState<'all' | 'users'>('all')
  const [manualUserQuery, setManualUserQuery] = useState('')
  const [manualTargetUserIds, setManualTargetUserIds] = useState<number[]>([])
  const [isManualSending, setIsManualSending] = useState(false)
  const [isManualImageLoading, setIsManualImageLoading] = useState(false)
  const manualFileInputRef = useRef<HTMLInputElement>(null)

  const flowsQuery = trpc.admin.notifications.flows.list.useQuery(undefined, {
    staleTime: 30_000,
  })

  const flows = useMemo(
    () => (flowsQuery.data ?? []) as NotificationFlow[],
    [flowsQuery.data],
  )

  const resolvedSelectedFlowId = useMemo(() => {
    if (
      selectedFlowId !== null &&
      flows.some((flow) => flow.id === selectedFlowId)
    ) {
      return selectedFlowId
    }

    return flows[0]?.id ?? null
  }, [flows, selectedFlowId])

  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.id === resolvedSelectedFlowId) ?? null,
    [flows, resolvedSelectedFlowId],
  )

  const updateFlowMutation = trpc.admin.notifications.flows.update.useMutation({
    onSuccess: async () => {
      await flowsQuery.refetch()
      success('Изменения применены')
    },
    onError: (mutationError: unknown) => {
      error(getErrorMessage(mutationError, 'Не удалось обновить флоу'))
    },
  })

  const runCronMutation = trpc.admin.notifications.cron.runNow.useMutation({
    onSuccess: () => {
      success('Cron выполнен')
    },
    onError: (mutationError: unknown) => {
      error(getErrorMessage(mutationError, 'Не удалось запустить cron'))
    },
  })

  const onboardedUsers = useMemo(
    () =>
      [...state.users]
        .filter((user) => user.isOnboarded)
        .sort((a, b) => a.login.localeCompare(b.login, 'ru')),
    [state.users],
  )

  const filteredManualUsers = useMemo(() => {
    const normalized = manualUserQuery.trim().toLowerCase()

    if (!normalized) {
      return onboardedUsers
    }

    return onboardedUsers.filter((user) => {
      return (
        user.login.toLowerCase().includes(normalized) ||
        user.name.toLowerCase().includes(normalized) ||
        (user.telegramUsername ?? '').toLowerCase().includes(normalized) ||
        String(user.id).includes(normalized)
      )
    })
  }, [manualUserQuery, onboardedUsers])

  const manualRecipientsCount = useMemo(
    () =>
      countBroadcastRecipients(
        manualAudience,
        null,
        null,
        manualTargetUserIds,
      ),
    [countBroadcastRecipients, manualAudience, manualTargetUserIds],
  )

  const manualPreviewImage = manualImageDataUrl

  const toggleFlowEnabled = (flow: NotificationFlow) => {
    if (updateFlowMutation.isPending) {
      return
    }

    updateFlowMutation.mutate({
      flowId: flow.id,
      isEnabled: !flow.isEnabled,
    })
  }

  const toggleManualUser = (userId: number) => {
    setManualTargetUserIds((current) =>
      current.includes(userId)
        ? current.filter((value) => value !== userId)
        : [...current, userId],
    )
  }

  const selectAllFilteredUsers = () => {
    setManualTargetUserIds((current) => {
      const next = new Set(current)

      for (const user of filteredManualUsers) {
        next.add(user.id)
      }

      return Array.from(next)
    })
  }

  const clearManualUsers = () => {
    setManualTargetUserIds([])
  }

  const handleManualFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsManualImageLoading(true)

    try {
      const dataUrl = await fileToDataUrl(file)
      setManualImageDataUrl(dataUrl)
    } catch {
      error('Не удалось обработать картинку')
    } finally {
      setIsManualImageLoading(false)

      if (manualFileInputRef.current) {
        manualFileInputRef.current.value = ''
      }
    }
  }

  const handleSendManualBroadcast = async () => {
    if (isManualSending) {
      return
    }

    if (!manualMessage.trim()) {
      error('Введите текст общей рассылки')
      return
    }

    if (manualAudience === 'users' && manualTargetUserIds.length === 0) {
      error('Выберите хотя бы одного пользователя')
      return
    }

    setIsManualSending(true)

    const broadcastId = await createBroadcast({
      message: manualMessage.trim(),
      imageUrl: manualPreviewImage,
      targetFilter: manualAudience,
      targetUserIds: manualAudience === 'users' ? manualTargetUserIds : null,
      targetSeriesId: null,
      targetTournamentId: null,
    })

    if (!broadcastId) {
      setIsManualSending(false)
      error('Не удалось создать общую рассылку')
      return
    }

    const sent = await sendBroadcast(broadcastId)
    setIsManualSending(false)

    if (!sent) {
      error('Не удалось отправить общую рассылку')
      return
    }

    setManualMessage('')
    setManualImageDataUrl(null)
    setManualUserQuery('')
    setManualTargetUserIds([])
    success('Изменения применены')
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Уведомления</h1>
        <button
          type="button"
          onClick={() => {
            void flowsQuery.refetch()
          }}
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
        >
          Обновить
        </button>
      </div>

      {!flowsQuery.isLoading && flows.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          В базе нет notification flow. Запусти на backend{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
            bun run db:seed:notifications
          </code>
          .
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[440px_minmax(0,1fr)]">
        <section className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="grid grid-cols-[1fr_100px_90px] gap-4 border-b border-[var(--line)] pb-3 text-sm font-semibold text-[var(--text-secondary)]">
            <span>название</span>
            <span>триггер</span>
            <span>статус</span>
          </div>

          <div className="space-y-1">
            {flows.map((flow) => {
              const isSelected = flow.id === resolvedSelectedFlowId

              return (
                <div
                  key={flow.id}
                  className={`grid grid-cols-[1fr_100px_90px] items-center gap-4 rounded-lg px-2 py-1.5 transition ${
                    isSelected ? 'bg-[#f3f0ff]' : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFlowId(flow.id)}
                    className={`min-w-0 text-left text-[15px] ${
                      isSelected
                        ? 'font-semibold text-[var(--accent)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="block truncate">{flow.name}</span>
                  </button>

                  <span className="text-sm text-[var(--text-primary)]">
                    {getTriggerLabel(flow)}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleFlowEnabled(flow)}
                    disabled={updateFlowMutation.isPending}
                    className={`text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      flow.isEnabled
                        ? 'text-emerald-600 hover:text-emerald-700'
                        : 'text-[var(--text-primary)] hover:text-[var(--accent)]'
                    }`}
                  >
                    {flow.isEnabled ? 'вкл' : 'выкл'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {selectedFlow ? (
          <NotificationFlowEditor
            key={selectedFlow.id}
            flow={selectedFlow}
            onRunCron={(flow) => {
              runCronMutation.mutate({
                force: true,
                flowSlugs: [flow.slug],
              })
            }}
          />
        ) : (
          <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-sm text-[var(--text-muted)]">Выберите флоу слева.</p>
          </section>
        )}
      </div>

      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Ручная рассылка
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Оставляем отдельным блоком. Отправка идет только пользователям,
            которые прошли онбординг.
          </p>
        </div>

        <FormField
          as="textarea"
          label="Текст сообщения"
          textareaProps={{
            rows: 6,
            value: manualMessage,
            onChange: (event) => setManualMessage(event.target.value),
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
              ref={manualFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleManualFileChange}
            />
            <button
              type="button"
              onClick={() => manualFileInputRef.current?.click()}
              disabled={isManualImageLoading}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isManualImageLoading ? 'Загрузка...' : 'Загрузить картинку'}
            </button>
            {manualPreviewImage ? (
              <button
                type="button"
                onClick={() => {
                  setManualImageDataUrl(null)
                }}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
              >
                Очистить
              </button>
            ) : null}
          </div>

          {manualPreviewImage ? (
            <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
              <img src={manualPreviewImage} alt="Превью картинки рассылки" className="h-44 w-full object-cover" />
            </div>
          ) : null}
        </div>

        <FormField
          as="select"
          label="Кому отправить"
          options={[
            { value: 'all', label: 'Всем пользователям' },
            { value: 'users', label: 'Выбранным пользователям' },
          ]}
          selectProps={{
            value: manualAudience,
            onChange: (event) =>
              setManualAudience(event.target.value as 'all' | 'users'),
          }}
        />

        {manualAudience === 'users' ? (
          <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--bg-surface-muted)] p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <FormField
                label="Поиск пользователей"
                inputProps={{
                  value: manualUserQuery,
                  onChange: (event) => setManualUserQuery(event.target.value),
                  placeholder: 'Ник, имя, @username или ID',
                }}
              />
              <button
                type="button"
                onClick={selectAllFilteredUsers}
                className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
              >
                Выбрать найденных
              </button>
              <button
                type="button"
                onClick={clearManualUsers}
                className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
              >
                Очистить
              </button>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-white">
              <div className="border-b border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)]">
                Выбрано пользователей: {manualRecipientsCount}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {filteredManualUsers.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-[var(--text-muted)]">
                    Пользователи не найдены
                  </div>
                ) : (
                  filteredManualUsers.map((user) => {
                    const checked = manualTargetUserIds.includes(user.id)

                    return (
                      <label
                        key={user.id}
                        className="flex cursor-pointer items-start gap-3 border-b border-[var(--line)] px-3 py-3 last:border-b-0 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleManualUser(user.id)}
                          className="mt-0.5 h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {user.login}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {user.name}
                            {user.telegramUsername
                              ? ` · @${user.telegramUsername}`
                              : ''}
                            {` · ID ${user.id}`}
                          </div>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-surface-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
            Сообщение будет отправлено всем пользователям, которые уже прошли
            онбординг.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            Получателей: {manualRecipientsCount}
          </p>
          <button
            type="button"
            onClick={() => void handleSendManualBroadcast()}
            disabled={
              isManualSending ||
              !manualMessage.trim() ||
              manualRecipientsCount === 0
            }
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isManualSending ? 'Отправляем...' : 'Отправить сообщение'}
          </button>
        </div>
      </section>

    </div>
  )
}
