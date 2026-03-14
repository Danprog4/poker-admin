import { useEffect, useMemo, useState } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormField } from '../components/FormField'
import { formatDateTime } from '../lib/date'
import type { AdminStatus } from '../lib/admin-models'
import { useAdminData } from '../providers/useAdminData'

type StatusFormState = {
  name: string
  slug: string
  description: string
  activeImageUrl: string
  inactiveImageUrl: string
  perkDescription: string
  requirements: string
  isManualOnly: string
  sortOrder: number
}

const toNullable = (value: string) => {
  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const toStatusForm = (status?: AdminStatus): StatusFormState => ({
  name: status?.name ?? '',
  slug: status?.slug ?? '',
  description: status?.description ?? '',
  activeImageUrl: status?.activeImageUrl ?? '',
  inactiveImageUrl: status?.inactiveImageUrl ?? '',
  perkDescription: status?.perkDescription ?? '',
  requirements: status?.requirements ?? '{}',
  isManualOnly: status?.isManualOnly ? 'true' : 'false',
  sortOrder: status?.sortOrder ?? 0,
})

function ImagePreview({
  label,
  src,
}: {
  label: string
  src: string
}) {
  if (!src.trim()) {
    return null
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-gray-50/70 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <img src={src} alt={label} className="h-20 w-20 rounded-xl object-contain" />
    </div>
  )
}

export function StatusesPage() {
  const { state, createStatus, updateStatus, deleteStatus } = useAdminData()

  const [newStatus, setNewStatus] = useState<StatusFormState>(() => toStatusForm())
  const [statusDraftEdits, setStatusDraftEdits] = useState<Record<number, Partial<StatusFormState>>>({})
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!notice) {
      return
    }

    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const statusBaseDrafts = useMemo(
    () =>
      Object.fromEntries(state.statuses.map((item) => [item.id, toStatusForm(item)])) as Record<
        number,
        StatusFormState
      >,
    [state.statuses],
  )

  const patchStatusDraft = (statusId: number, patch: Partial<StatusFormState>) => {
    setStatusDraftEdits((previous) => {
      const current = statusBaseDrafts[statusId]

      if (!current && !previous[statusId]) {
        return previous
      }

      return {
        ...previous,
        [statusId]: {
          ...(previous[statusId] ?? current),
          ...patch,
        },
      }
    })
  }

  const handleCreateStatus = async () => {
    if (isCreating) {
      return
    }

    if (!newStatus.name.trim() || !newStatus.slug.trim()) {
      setNotice({ text: 'Для статуса нужны название и slug', type: 'error' })
      return
    }

    setIsCreating(true)
    const created = await createStatus({
      name: newStatus.name.trim(),
      slug: newStatus.slug.trim().toLowerCase(),
      description: toNullable(newStatus.description),
      activeImageUrl: toNullable(newStatus.activeImageUrl),
      inactiveImageUrl: toNullable(newStatus.inactiveImageUrl),
      perkDescription: toNullable(newStatus.perkDescription),
      requirements: newStatus.requirements.trim() || '{}',
      isManualOnly: newStatus.isManualOnly === 'true',
      sortOrder: newStatus.sortOrder,
    })
    setIsCreating(false)

    if (!created) {
      setNotice({ text: 'Не удалось создать статус', type: 'error' })
      return
    }

    setNewStatus(toStatusForm())
    setNotice({ text: 'Статус создан', type: 'success' })
  }

  const handleSaveStatus = async (statusId: number) => {
    if (pendingStatusId !== null) {
      return
    }

    const draft = {
      ...statusBaseDrafts[statusId],
      ...statusDraftEdits[statusId],
    }

    if (!draft.name.trim() || !draft.slug.trim()) {
      setNotice({ text: 'У статуса должны быть заполнены название и slug', type: 'error' })
      return
    }

    setPendingStatusId(statusId)
    const updated = await updateStatus(statusId, {
      name: draft.name.trim(),
      slug: draft.slug.trim().toLowerCase(),
      description: toNullable(draft.description),
      activeImageUrl: toNullable(draft.activeImageUrl),
      inactiveImageUrl: toNullable(draft.inactiveImageUrl),
      perkDescription: toNullable(draft.perkDescription),
      requirements: draft.requirements.trim() || '{}',
      isManualOnly: draft.isManualOnly === 'true',
      sortOrder: draft.sortOrder,
    })
    setPendingStatusId(null)

    if (!updated) {
      setNotice({ text: 'Не удалось обновить статус', type: 'error' })
      return
    }

    setStatusDraftEdits((previous) => {
      const next = { ...previous }
      delete next[statusId]
      return next
    })
    setNotice({ text: 'Статус обновлён', type: 'success' })
  }

  const handleDeleteStatus = async () => {
    if (deleteTarget === null || isDeleting) {
      return
    }

    setIsDeleting(true)
    const deleted = await deleteStatus(deleteTarget)
    setIsDeleting(false)

    if (!deleted) {
      setNotice({ text: 'Не удалось удалить статус', type: 'error' })
      return
    }

    setDeleteTarget(null)
    setNotice({ text: 'Статус удалён', type: 'success' })
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Статусы</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Здесь настраиваются тексты, изображения и JSON-требования для клиентского приложения.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            label="Название"
            inputProps={{
              value: newStatus.name,
              onChange: (event) =>
                setNewStatus((previous) => ({
                  ...previous,
                  name: event.target.value,
                })),
            }}
          />
          <FormField
            label="Slug"
            inputProps={{
              value: newStatus.slug,
              onChange: (event) =>
                setNewStatus((previous) => ({
                  ...previous,
                  slug: event.target.value,
                })),
            }}
          />
          <FormField
            as="select"
            label="Только ручной"
            options={[
              { value: 'false', label: 'Нет' },
              { value: 'true', label: 'Да' },
            ]}
            selectProps={{
              value: newStatus.isManualOnly,
              onChange: (event) =>
                setNewStatus((previous) => ({
                  ...previous,
                  isManualOnly: event.target.value,
                })),
            }}
          />
          <FormField
            label="Порядок"
            inputProps={{
              type: 'number',
              value: newStatus.sortOrder,
              onChange: (event) =>
                setNewStatus((previous) => ({
                  ...previous,
                  sortOrder: Number(event.target.value || 0),
                })),
            }}
          />
          <FormField
            label="Active image URL"
            inputProps={{
              value: newStatus.activeImageUrl,
              onChange: (event) =>
                setNewStatus((previous) => ({
                  ...previous,
                  activeImageUrl: event.target.value,
                })),
            }}
          />
          <FormField
            label="Inactive image URL"
            inputProps={{
              value: newStatus.inactiveImageUrl,
              onChange: (event) =>
                setNewStatus((previous) => ({
                  ...previous,
                  inactiveImageUrl: event.target.value,
                })),
            }}
          />
          <div className="md:col-span-2">
            <FormField
              as="textarea"
              label="Описание"
              textareaProps={{
                rows: 3,
                value: newStatus.description,
                onChange: (event) =>
                  setNewStatus((previous) => ({
                    ...previous,
                    description: event.target.value,
                  })),
              }}
            />
          </div>
          <div className="md:col-span-2">
            <FormField
              as="textarea"
              label="Описание привилегии"
              textareaProps={{
                rows: 3,
                value: newStatus.perkDescription,
                onChange: (event) =>
                  setNewStatus((previous) => ({
                    ...previous,
                    perkDescription: event.target.value,
                  })),
              }}
            />
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <FormField
              as="textarea"
              label="Requirements JSON"
              textareaProps={{
                rows: 5,
                value: newStatus.requirements,
                onChange: (event) =>
                  setNewStatus((previous) => ({
                    ...previous,
                    requirements: event.target.value,
                  })),
                placeholder:
                  '{"points":2000,"tournaments":3,"monthsActive":0,"itmCount":0,"wins":0,"itmPercent":0,"top10Monthly":false,"top3Monthly":false,"significantWin":false}',
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleCreateStatus()}
          disabled={isCreating}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? 'Добавляем статус...' : 'Добавить статус'}
        </button>
      </section>

      <section className="space-y-3">
        {[...state.statuses]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((status) => {
            const draft = {
              ...statusBaseDrafts[status.id],
              ...statusDraftEdits[status.id],
            }

            return (
              <div key={status.id} className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-['Space_Grotesk'] text-xl font-bold">{status.name}</h2>
                    <p className="text-xs text-[var(--text-muted)]">Создан: {formatDateTime(status.createdAt)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveStatus(status.id)}
                      disabled={pendingStatusId === status.id}
                      className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingStatusId === status.id ? 'Сохраняем...' : 'Сохранить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(status.id)}
                      disabled={pendingStatusId === status.id}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <FormField
                    label="Название"
                    inputProps={{
                      value: draft.name,
                      onChange: (event) => patchStatusDraft(status.id, { name: event.target.value }),
                    }}
                  />
                  <FormField
                    label="Slug"
                    inputProps={{
                      value: draft.slug,
                      onChange: (event) => patchStatusDraft(status.id, { slug: event.target.value }),
                    }}
                  />
                  <FormField
                    as="select"
                    label="Только ручной"
                    options={[
                      { value: 'false', label: 'Нет' },
                      { value: 'true', label: 'Да' },
                    ]}
                    selectProps={{
                      value: draft.isManualOnly,
                      onChange: (event) => patchStatusDraft(status.id, { isManualOnly: event.target.value }),
                    }}
                  />
                  <FormField
                    label="Порядок"
                    inputProps={{
                      type: 'number',
                      value: draft.sortOrder,
                      onChange: (event) =>
                        patchStatusDraft(status.id, {
                          sortOrder: Number(event.target.value || 0),
                        }),
                    }}
                  />
                  <FormField
                    label="Active image URL"
                    inputProps={{
                      value: draft.activeImageUrl,
                      onChange: (event) =>
                        patchStatusDraft(status.id, {
                          activeImageUrl: event.target.value,
                        }),
                    }}
                  />
                  <FormField
                    label="Inactive image URL"
                    inputProps={{
                      value: draft.inactiveImageUrl,
                      onChange: (event) =>
                        patchStatusDraft(status.id, {
                          inactiveImageUrl: event.target.value,
                        }),
                    }}
                  />
                  <div className="md:col-span-2">
                    <FormField
                      as="textarea"
                      label="Описание"
                      textareaProps={{
                        rows: 3,
                        value: draft.description,
                        onChange: (event) =>
                          patchStatusDraft(status.id, {
                            description: event.target.value,
                          }),
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FormField
                      as="textarea"
                      label="Описание привилегии"
                      textareaProps={{
                        rows: 3,
                        value: draft.perkDescription,
                        onChange: (event) =>
                          patchStatusDraft(status.id, {
                            perkDescription: event.target.value,
                          }),
                      }}
                    />
                  </div>
                  <div className="md:col-span-2 xl:col-span-4">
                    <FormField
                      as="textarea"
                      label="Requirements JSON"
                      textareaProps={{
                        rows: 5,
                        value: draft.requirements,
                        onChange: (event) =>
                          patchStatusDraft(status.id, {
                            requirements: event.target.value,
                          }),
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ImagePreview label="Active preview" src={draft.activeImageUrl} />
                  <ImagePreview label="Inactive preview" src={draft.inactiveImageUrl} />
                </div>
              </div>
            )
          })}
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
        open={deleteTarget !== null}
        title="Удалить статус?"
        description="Статус будет удалён. Это возможно только если он не назначен пользователям."
        confirmLabel="Удалить"
        confirmPendingLabel="Удаляем..."
        pending={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteStatus()}
      />
    </div>
  )
}
