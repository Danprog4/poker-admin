import { Link, useParams } from 'react-router-dom'

import { ImagePickerField } from '../components/ImagePickerField'
import { FormField } from '../components/FormField'
import { StatusRequirementsEditor } from '../components/StatusRequirementsEditor'
import {
  STATUS_ASSET_OPTIONS,
  parseRequirements,
  slugify,
  stringifyRequirements,
  toNullable,
  type StatusEditorForm,
} from '../lib/status-editor'
import { useAdminData } from '../providers/useAdminData'
import { useToast } from '../providers/ToastProvider'
import { useEffect, useMemo, useState } from 'react'

export function StatusDetailsPage() {
  const { id } = useParams()
  const statusId = Number(id)
  const { state, getStatusById, updateStatus } = useAdminData()
  const { success, error } = useToast()
  const status = getStatusById(statusId)

  const [form, setForm] = useState<StatusEditorForm | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!status) {
      return
    }

    setForm({
      name: status.name,
      description: status.description ?? '',
      activeImageUrl: status.activeImageUrl ?? '/images/statuses/novichok-active.png',
      inactiveImageUrl: status.inactiveImageUrl ?? '/images/statuses/novichok-inactive.png',
      perkDescription: status.perkDescription ?? '',
      isManualOnly: status.isManualOnly ? 'true' : 'false',
      requirements: parseRequirements(status.requirements),
    })
  }, [status])

  const activeImageOptions = useMemo(() => {
    const map = new Map<string, string>()

    for (const option of STATUS_ASSET_OPTIONS.filter((item) => item.value.includes('-active'))) {
      map.set(option.value, option.label)
    }

    for (const item of state.statuses) {
      const value = item.activeImageUrl?.trim()

      if (value && !map.has(value)) {
        map.set(value, `${item.name} · активная`)
      }
    }

    return Array.from(map, ([value, label]) => ({ value, label }))
  }, [state.statuses])

  const inactiveImageOptions = useMemo(() => {
    const map = new Map<string, string>()

    for (const option of STATUS_ASSET_OPTIONS.filter((item) => item.value.includes('-inactive'))) {
      map.set(option.value, option.label)
    }

    for (const item of state.statuses) {
      const value = item.inactiveImageUrl?.trim()

      if (value && !map.has(value)) {
        map.set(value, `${item.name} · неактивная`)
      }
    }

    return Array.from(map, ([value, label]) => ({ value, label }))
  }, [state.statuses])

  const handleSave = async () => {
    if (!status || !form || isSaving) {
      return
    }

    const slug = slugify(form.name)

    if (!form.name.trim() || !slug) {
      error('У статуса должно быть название')
      return
    }

    setIsSaving(true)
    const updated = await updateStatus(status.id, {
      name: form.name.trim(),
      slug,
      description: toNullable(form.description),
      activeImageUrl: toNullable(form.activeImageUrl),
      inactiveImageUrl: toNullable(form.inactiveImageUrl),
      perkDescription: toNullable(form.perkDescription),
      requirements: stringifyRequirements(form.requirements),
      isManualOnly: form.isManualOnly === 'true',
    })
    setIsSaving(false)

    if (!updated) {
      error('Не удалось обновить статус')
      return
    }

    success('Статус обновлён')
  }

  if (!status || !form) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--text-muted)]">
        Статус не найден.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold">{status.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Slug собирается автоматически: <span className="font-mono">{slugify(form.name) || '—'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/statuses"
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
          >
            Назад к списку
          </Link>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            label="Название"
            inputProps={{
              value: form.name,
              onChange: (event) => setForm((current) => (current ? { ...current, name: event.target.value } : current)),
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
              value: form.isManualOnly,
              onChange: (event) => setForm((current) => (current ? { ...current, isManualOnly: event.target.value } : current)),
            }}
          />
          <div className="md:col-span-2">
            <FormField
              as="textarea"
              label="Описание"
              textareaProps={{
                rows: 3,
                value: form.description,
                onChange: (event) => setForm((current) => (current ? { ...current, description: event.target.value } : current)),
              }}
            />
          </div>
          <div className="md:col-span-2">
            <FormField
              as="textarea"
              label="Привилегии"
              textareaProps={{
                rows: 3,
                value: form.perkDescription,
                onChange: (event) => setForm((current) => (current ? { ...current, perkDescription: event.target.value } : current)),
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ImagePickerField
            label="Активная картинка"
            value={form.activeImageUrl}
            onChange={(value) => setForm((current) => (current ? { ...current, activeImageUrl: value } : current))}
            options={activeImageOptions}
            previewLabel="Активное состояние"
          />
          <ImagePickerField
            label="Неактивная картинка"
            value={form.inactiveImageUrl}
            onChange={(value) => setForm((current) => (current ? { ...current, inactiveImageUrl: value } : current))}
            options={inactiveImageOptions}
            previewLabel="Неактивное состояние"
          />
        </div>

        <StatusRequirementsEditor
          value={form.requirements}
          onChange={(requirements) => setForm((current) => (current ? { ...current, requirements } : current))}
        />
      </section>
    </div>
  )
}
