import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { FormField } from '../components/FormField'
import { ImagePickerField } from '../components/ImagePickerField'
import { formatDateTime } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'
import { useToast } from '../providers/ToastProvider'

type MedalFormState = {
  name: string
  description: string
  category: string
  iconUrl: string
  inactiveIconUrl: string
  tournamentId: string
}

const MEDAL_ASSET_OPTIONS = Array.from({ length: 8 }, (_, index) => ({
  value: `/images/medals/medal-${index + 1}.png`,
  label: `Медаль ${index + 1}`,
}))

const toNullable = (value: string) => {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/[а-яё]/gi, (char) => {
      const map: Record<string, string> = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'e',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'c',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'y',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
      }

      return map[char.toLowerCase()] ?? ''
    })
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

export function MedalDetailsPage() {
  const { id } = useParams()
  const medalId = Number(id)
  const { state, updateAchievement, updateTournament } = useAdminData()
  const { success, error } = useToast()
  const medal = state.achievements.find((item) => item.id === medalId) ?? null

  const [form, setForm] = useState<MedalFormState | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const linkedTournamentByMedalId = useMemo(() => {
    const result = new Map<number, number>()

    for (const tournament of state.tournaments) {
      if (typeof tournament.medalId === 'number' && !result.has(tournament.medalId)) {
        result.set(tournament.medalId, tournament.id)
      }
    }

    return result
  }, [state.tournaments])

  useEffect(() => {
    if (!medal) {
      return
    }

    setForm({
      name: medal.name,
      description: medal.description ?? '',
      category: medal.category ?? 'month_grand_final',
      iconUrl: medal.iconUrl ?? '/images/medals/medal-1.png',
      inactiveIconUrl: medal.inactiveIconUrl ?? medal.iconUrl ?? '/images/medals/medal-1.png',
      tournamentId: linkedTournamentByMedalId.has(medal.id)
        ? String(linkedTournamentByMedalId.get(medal.id))
        : 'none',
    })
  }, [linkedTournamentByMedalId, medal])

  const tournamentOptions = useMemo(
    () => [
      { value: 'none', label: 'Без привязки' },
      ...[...state.tournaments]
        .sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf())
        .map((item) => ({
          value: String(item.id),
          label: `${item.name} · ${formatDateTime(item.date)}`,
        })),
    ],
    [state.tournaments],
  )

  const categoryOptions = useMemo(() => {
    const values = new Set<string>(['month_grand_final'])

    for (const item of state.achievements) {
      if (item.category?.trim()) {
        values.add(item.category)
      }
    }

    return [...values].map((value) => ({ value, label: value }))
  }, [state.achievements])

  const medalImageOptions = useMemo(() => {
    const map = new Map<string, string>()

    for (const option of MEDAL_ASSET_OPTIONS) {
      map.set(option.value, option.label)
    }

    for (const achievement of state.achievements) {
      const icon = achievement.iconUrl?.trim()
      const inactiveIcon = achievement.inactiveIconUrl?.trim()

      if (icon && !map.has(icon)) {
        map.set(icon, `${achievement.name} · активная`)
      }

      if (inactiveIcon && !map.has(inactiveIcon)) {
        map.set(inactiveIcon, `${achievement.name} · неактивная`)
      }
    }

    return Array.from(map, ([value, label]) => ({ value, label }))
  }, [state.achievements])

  const syncMedalTournament = async (targetMedalId: number, tournamentValue: string) => {
    const targetTournamentId = tournamentValue === 'none' ? null : Number(tournamentValue)
    const linkedTournaments = state.tournaments.filter((item) => item.medalId === targetMedalId)

    for (const tournament of linkedTournaments) {
      if (tournament.id !== targetTournamentId) {
        const cleared = await updateTournament(tournament.id, { medalId: null })

        if (!cleared) {
          return false
        }
      }
    }

    if (!targetTournamentId) {
      return true
    }

    const targetTournament = state.tournaments.find((item) => item.id === targetTournamentId) ?? null

    if (!targetTournament || targetTournament.medalId !== targetMedalId) {
      return updateTournament(targetTournamentId, { medalId: targetMedalId })
    }

    return true
  }

  const handleSave = async () => {
    if (!medal || !form || isSaving) {
      return
    }

    const slug = slugify(form.name)

    if (!form.name.trim() || !slug) {
      error('У медали должно быть название')
      return
    }

    setIsSaving(true)
    const updated = await updateAchievement(medal.id, {
      name: form.name.trim(),
      slug,
      description: toNullable(form.description),
      category: toNullable(form.category),
      iconUrl: toNullable(form.iconUrl),
      inactiveIconUrl: toNullable(form.inactiveIconUrl),
    })

    if (!updated) {
      setIsSaving(false)
      error('Не удалось обновить медаль')
      return
    }

    const synced = await syncMedalTournament(medal.id, form.tournamentId)
    setIsSaving(false)

    if (!synced) {
      error('Не удалось обновить привязку к турниру')
      return
    }

    success('Медаль обновлена')
  }

  if (!medal || !form) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--text-muted)]">
        Медаль не найдена.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold">{medal.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Slug собирается автоматически: <span className="font-mono">{slugify(form.name) || '—'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/medals"
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
            label="Категория"
            options={categoryOptions}
            selectProps={{
              value: form.category,
              onChange: (event) => setForm((current) => (current ? { ...current, category: event.target.value } : current)),
            }}
          />
          <FormField
            as="select"
            label="Привязать к турниру"
            options={tournamentOptions}
            selectProps={{
              value: form.tournamentId,
              onChange: (event) => setForm((current) => (current ? { ...current, tournamentId: event.target.value } : current)),
            }}
          />
          <div className="md:col-span-2 xl:col-span-4">
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
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ImagePickerField
            label="Активная иконка"
            value={form.iconUrl}
            onChange={(value) => setForm((current) => (current ? { ...current, iconUrl: value } : current))}
            options={medalImageOptions}
            previewLabel="Активная иконка"
          />
          <ImagePickerField
            label="Неактивная иконка"
            value={form.inactiveIconUrl}
            onChange={(value) => setForm((current) => (current ? { ...current, inactiveIconUrl: value } : current))}
            options={medalImageOptions}
            previewLabel="Неактивная иконка"
          />
        </div>
      </section>
    </div>
  )
}
