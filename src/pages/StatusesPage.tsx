import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { ImagePickerField } from '../components/ImagePickerField'
import { FormField } from '../components/FormField'
import { StatusRequirementsEditor } from '../components/StatusRequirementsEditor'
import { formatDateTime } from '../lib/date'
import {
  EMPTY_STATUS_FORM,
  STATUS_ASSET_OPTIONS,
  parseRequirements,
  slugify,
  stringifyRequirements,
  summarizeRequirements,
  toNullable,
} from '../lib/status-editor'
import { useAdminData } from '../providers/useAdminData'
import { useToast } from '../providers/ToastProvider'

export function StatusesPage() {
  const { state, createStatus, deleteStatus } = useAdminData()
  const { success, error } = useToast()

  const [createForm, setCreateForm] = useState(EMPTY_STATUS_FORM)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const rows = useMemo(
    () => [...state.statuses].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')),
    [state.statuses],
  )

  const activeImageOptions = useMemo(() => {
    const map = new Map<string, string>()

    for (const option of STATUS_ASSET_OPTIONS.filter((item) => item.value.includes('-active'))) {
      map.set(option.value, option.label)
    }

    for (const status of state.statuses) {
      const value = status.activeImageUrl?.trim()

      if (value && !map.has(value)) {
        map.set(value, `${status.name} · активная`)
      }
    }

    return Array.from(map, ([value, label]) => ({ value, label }))
  }, [state.statuses])

  const inactiveImageOptions = useMemo(() => {
    const map = new Map<string, string>()

    for (const option of STATUS_ASSET_OPTIONS.filter((item) => item.value.includes('-inactive'))) {
      map.set(option.value, option.label)
    }

    for (const status of state.statuses) {
      const value = status.inactiveImageUrl?.trim()

      if (value && !map.has(value)) {
        map.set(value, `${status.name} · неактивная`)
      }
    }

    return Array.from(map, ([value, label]) => ({ value, label }))
  }, [state.statuses])

  const handleCreate = async () => {
    if (isCreating) {
      return
    }

    if (!createForm.name.trim()) {
      error('Укажи название статуса')
      return
    }

    const slug = slugify(createForm.name)

    if (!slug) {
      error('Не удалось собрать slug из названия')
      return
    }

    setIsCreating(true)
    const created = await createStatus({
      name: createForm.name.trim(),
      slug,
      description: toNullable(createForm.description),
      activeImageUrl: toNullable(createForm.activeImageUrl),
      inactiveImageUrl: toNullable(createForm.inactiveImageUrl),
      perkDescription: toNullable(createForm.perkDescription),
      requirements: stringifyRequirements(createForm.requirements),
      isManualOnly: createForm.isManualOnly === 'true',
      sortOrder: rows.length,
    })
    setIsCreating(false)

    if (!created) {
      error('Не удалось создать статус')
      return
    }

    setCreateForm(EMPTY_STATUS_FORM)
    success('Статус создан')
  }

  const handleDelete = async () => {
    if (deleteTarget === null || isDeleting) {
      return
    }

    setIsDeleting(true)
    const deleted = await deleteStatus(deleteTarget)
    setIsDeleting(false)

    if (!deleted) {
      error('Не удалось удалить статус')
      return
    }

    setDeleteTarget(null)
    success('Статус удалён')
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Статусы</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Здесь создаются статусы. Для редактирования существующего статуса открой отдельную страницу.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            label="Название"
            inputProps={{
              value: createForm.name,
              placeholder: 'Например, Участник',
              onChange: (event) => setCreateForm((current) => ({ ...current, name: event.target.value })),
            }}
          />
          <FormField
            as="select"
            label="Только вручную"
            options={[
              { value: 'false', label: 'Нет' },
              { value: 'true', label: 'Да' },
            ]}
            selectProps={{
              value: createForm.isManualOnly,
              onChange: (event) => setCreateForm((current) => ({ ...current, isManualOnly: event.target.value })),
            }}
          />
          <div className="md:col-span-2">
            <FormField
              as="textarea"
              label="Описание"
              textareaProps={{
                rows: 3,
                value: createForm.description,
                placeholder: 'Коротко опиши статус для игрока',
                onChange: (event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  })),
              }}
            />
          </div>
          <div className="md:col-span-2">
            <FormField
              as="textarea"
              label="Привилегии"
              textareaProps={{
                rows: 3,
                value: createForm.perkDescription,
                placeholder: 'Что получает игрок с этим статусом',
                onChange: (event) =>
                  setCreateForm((current) => ({
                    ...current,
                    perkDescription: event.target.value,
                  })),
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ImagePickerField
            label="Активная картинка"
            value={createForm.activeImageUrl}
            onChange={(value) => setCreateForm((current) => ({ ...current, activeImageUrl: value }))}
            options={activeImageOptions}
            previewLabel="Активное состояние"
          />
          <ImagePickerField
            label="Неактивная картинка"
            value={createForm.inactiveImageUrl}
            onChange={(value) => setCreateForm((current) => ({ ...current, inactiveImageUrl: value }))}
            options={inactiveImageOptions}
            previewLabel="Неактивное состояние"
          />
        </div>

        <StatusRequirementsEditor
          value={createForm.requirements}
          onChange={(requirements) => setCreateForm((current) => ({ ...current, requirements }))}
        />

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={isCreating}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? 'Создаём статус...' : 'Создать статус'}
        </button>
      </section>

      <DataTable
        rows={rows}
        getRowKey={(row) => row.id}
        emptyLabel="Статусы пока не созданы"
        columns={[
          {
            header: 'Активная картинка',
            render: (row) =>
              row.activeImageUrl ? (
                <img src={row.activeImageUrl} alt={row.name} className="h-14 w-14 rounded-xl object-contain" />
              ) : (
                <span className="text-xs text-[var(--text-muted)]">—</span>
              ),
          },
          {
            header: 'Название',
            render: (row) => (
              <div className="space-y-1">
                <div className="font-semibold">{row.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{row.slug}</div>
              </div>
            ),
          },
          {
            header: 'Привилегии',
            render: (row) => row.perkDescription || <span className="text-[var(--text-muted)]">—</span>,
          },
          {
            header: 'Условия',
            render: (row) => (
              <span className="text-xs text-[var(--text-muted)]">{summarizeRequirements(parseRequirements(row.requirements))}</span>
            ),
          },
          {
            header: 'Создан',
            render: (row) => <span className="text-xs text-[var(--text-muted)]">{formatDateTime(row.createdAt)}</span>,
          },
          {
            header: '',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/statuses/${row.id}`}
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-gray-50"
                >
                  Редактировать
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(row.id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Удалить
                </button>
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Удалить статус?"
        description="Если статус уже назначен пользователям, удаление не сработает."
        confirmLabel="Удалить"
        confirmPendingLabel="Удаляем..."
        pending={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
