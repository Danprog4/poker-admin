import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
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

const createEmptyMedalForm = (): MedalFormState => ({
  name: '',
  description: '',
  category: 'month_grand_final',
  iconUrl: '',
  inactiveIconUrl: '',
  tournamentId: 'none',
})

export function MedalsPage() {
  const { state, createAchievement, deleteAchievement, updateTournament } = useAdminData()
  const { success, error } = useToast()

  const [createForm, setCreateForm] = useState<MedalFormState>(() => createEmptyMedalForm())
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const linkedTournamentByMedalId = useMemo(() => {
    const result = new Map<number, number>()

    for (const tournament of state.tournaments) {
      if (typeof tournament.medalId === 'number' && !result.has(tournament.medalId)) {
        result.set(tournament.medalId, tournament.id)
      }
    }

    return result
  }, [state.tournaments])

  const rows = useMemo(
    () => [...state.achievements].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')),
    [state.achievements],
  )

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

  const syncMedalTournament = async (medalId: number, tournamentValue: string) => {
    const targetTournamentId = tournamentValue === 'none' ? null : Number(tournamentValue)
    const linkedTournaments = state.tournaments.filter((item) => item.medalId === medalId)

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

    if (!targetTournament || targetTournament.medalId !== medalId) {
      return updateTournament(targetTournamentId, { medalId })
    }

    return true
  }

  const handleCreate = async () => {
    if (isCreating) {
      return
    }

    if (!createForm.name.trim()) {
      error('Укажи название медали')
      return
    }

    const slug = slugify(createForm.name)

    if (!slug) {
      error('Не удалось собрать slug из названия')
      return
    }

    setIsCreating(true)
    const created = await createAchievement({
      name: createForm.name.trim(),
      slug,
      description: toNullable(createForm.description),
      category: toNullable(createForm.category),
      iconUrl: toNullable(createForm.iconUrl),
      inactiveIconUrl: toNullable(createForm.inactiveIconUrl),
      sortOrder: rows.length,
    })

    if (!created) {
      setIsCreating(false)
      error('Не удалось создать медаль')
      return
    }

    if (createForm.tournamentId !== 'none') {
      const synced = await syncMedalTournament(created.id, createForm.tournamentId)

      if (!synced) {
        setIsCreating(false)
        error('Медаль создали, но привязка к турниру не сохранилась')
        return
      }
    }

    setIsCreating(false)
    setCreateForm(createEmptyMedalForm())
    success('Медаль создана')
  }

  const handleDelete = async () => {
    if (deleteTarget === null || isDeleting) {
      return
    }

    setIsDeleting(true)
    const deleted = await deleteAchievement(deleteTarget)
    setIsDeleting(false)

    if (!deleted) {
      error('Не удалось удалить медаль')
      return
    }

    setDeleteTarget(null)
    success('Медаль удалена')
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Медали</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Здесь создаются медали. Редактирование существующей медали открывается на отдельной странице.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            label="Название"
            inputProps={{
              value: createForm.name,
              placeholder: 'Например, Month Grand Final',
              onChange: (event) => setCreateForm((current) => ({ ...current, name: event.target.value })),
            }}
          />
          <FormField
            as="select"
            label="Категория"
            options={categoryOptions}
            selectProps={{
              value: createForm.category,
              onChange: (event) => setCreateForm((current) => ({ ...current, category: event.target.value })),
            }}
          />
          <FormField
            as="select"
            label="Привязать к турниру"
            options={tournamentOptions}
            selectProps={{
              value: createForm.tournamentId,
              onChange: (event) => setCreateForm((current) => ({ ...current, tournamentId: event.target.value })),
            }}
          />
          <div className="md:col-span-2 xl:col-span-4">
            <FormField
              as="textarea"
              label="Описание"
              textareaProps={{
                rows: 3,
                value: createForm.description,
                placeholder: 'Что это за медаль и за что её получает игрок',
                onChange: (event) => setCreateForm((current) => ({ ...current, description: event.target.value })),
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ImagePickerField
            label="Активная иконка"
            value={createForm.iconUrl}
            onChange={(value) => setCreateForm((current) => ({ ...current, iconUrl: value }))}
            options={[]}
            previewLabel="Активная иконка"
            allowUrlInput={false}
            allowExistingOptions={false}
          />
          <ImagePickerField
            label="Неактивная иконка"
            value={createForm.inactiveIconUrl}
            onChange={(value) => setCreateForm((current) => ({ ...current, inactiveIconUrl: value }))}
            options={[]}
            previewLabel="Неактивная иконка"
            previewMode="inactive-medal"
            allowUrlInput={false}
            allowExistingOptions={false}
          />
        </div>

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={isCreating}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? 'Создаём медаль...' : 'Создать медаль'}
        </button>
      </section>

      <DataTable
        rows={rows}
        getRowKey={(row) => row.id}
        emptyLabel="Медали пока не созданы"
        columns={[
          {
            header: 'Иконка',
            render: (row) =>
              row.iconUrl ? (
                <img src={row.iconUrl} alt={row.name} className="h-14 w-14 rounded-xl object-contain" />
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
            header: 'Категория',
            render: (row) => row.category || <span className="text-[var(--text-muted)]">—</span>,
          },
          {
            header: 'Турнир',
            render: (row) => {
              const linkedTournamentId = linkedTournamentByMedalId.get(row.id)
              const linkedTournament = state.tournaments.find((item) => item.id === linkedTournamentId) ?? null

              return linkedTournament ? linkedTournament.name : <span className="text-[var(--text-muted)]">—</span>
            },
          },
          {
            header: 'Создана',
            render: (row) => <span className="text-xs text-[var(--text-muted)]">{formatDateTime(row.createdAt)}</span>,
          },
          {
            header: '',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/medals/${row.id}`}
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
        title="Удалить медаль?"
        description="Удаление не сработает, если медаль уже используется в данных игрока."
        confirmLabel="Удалить"
        confirmPendingLabel="Удаляем..."
        pending={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
