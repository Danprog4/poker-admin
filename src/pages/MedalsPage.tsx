import { useEffect, useMemo, useState } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormField } from '../components/FormField'
import { formatDateTime } from '../lib/date'
import type { Achievement } from '../lib/admin-models'
import { useAdminData } from '../providers/useAdminData'

type MedalFormState = {
  name: string
  slug: string
  description: string
  category: string
  iconUrl: string
  inactiveIconUrl: string
  tournamentId: string
  sortOrder: number
}

const toNullable = (value: string) => {
  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const toMedalForm = (achievement?: Achievement): MedalFormState => ({
  name: achievement?.name ?? '',
  slug: achievement?.slug ?? '',
  description: achievement?.description ?? '',
  category: achievement?.category ?? '',
  iconUrl: achievement?.iconUrl ?? '',
  inactiveIconUrl: achievement?.inactiveIconUrl ?? '',
  tournamentId: 'none',
  sortOrder: achievement?.sortOrder ?? 0,
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

export function MedalsPage() {
  const {
    state,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    updateTournament,
  } = useAdminData()

  const [newMedal, setNewMedal] = useState<MedalFormState>(() => toMedalForm())
  const [medalDraftEdits, setMedalDraftEdits] = useState<Record<number, Partial<MedalFormState>>>({})
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingMedalId, setPendingMedalId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!notice) {
      return
    }

    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const medalBaseDrafts = useMemo(() => {
    const linkedTournamentByMedalId = new Map<number, number>()

    for (const tournament of state.tournaments) {
      if (typeof tournament.medalId === 'number' && !linkedTournamentByMedalId.has(tournament.medalId)) {
        linkedTournamentByMedalId.set(tournament.medalId, tournament.id)
      }
    }

    return Object.fromEntries(
      state.achievements.map((item) => [
        item.id,
        {
          ...toMedalForm(item),
          tournamentId: linkedTournamentByMedalId.has(item.id)
            ? String(linkedTournamentByMedalId.get(item.id))
            : 'none',
        },
      ]),
    ) as Record<number, MedalFormState>
  }, [state.achievements, state.tournaments])

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

  const patchMedalDraft = (medalId: number, patch: Partial<MedalFormState>) => {
    setMedalDraftEdits((previous) => {
      const current = medalBaseDrafts[medalId]

      if (!current && !previous[medalId]) {
        return previous
      }

      return {
        ...previous,
        [medalId]: {
          ...(previous[medalId] ?? current),
          ...patch,
        },
      }
    })
  }

  const handleCreateMedal = async () => {
    if (isCreating) {
      return
    }

    if (!newMedal.name.trim() || !newMedal.slug.trim()) {
      setNotice({ text: 'Для медали нужны название и slug', type: 'error' })
      return
    }

    setIsCreating(true)
    const created = await createAchievement({
      name: newMedal.name.trim(),
      slug: newMedal.slug.trim().toLowerCase(),
      description: toNullable(newMedal.description),
      category: toNullable(newMedal.category),
      iconUrl: toNullable(newMedal.iconUrl),
      inactiveIconUrl: toNullable(newMedal.inactiveIconUrl),
      sortOrder: newMedal.sortOrder,
    })

    if (!created) {
      setIsCreating(false)
      setNotice({ text: 'Не удалось создать медаль', type: 'error' })
      return
    }

    if (newMedal.tournamentId !== 'none') {
      const synced = await syncMedalTournament(created.id, newMedal.tournamentId)

      if (!synced) {
        setIsCreating(false)
        setNotice({ text: 'Медаль создана, но привязку к турниру сохранить не удалось', type: 'error' })
        return
      }
    }

    setIsCreating(false)
    setNewMedal(toMedalForm())
    setNotice({ text: 'Медаль создана', type: 'success' })
  }

  const handleSaveMedal = async (medalId: number) => {
    if (pendingMedalId !== null) {
      return
    }

    const draft = {
      ...medalBaseDrafts[medalId],
      ...medalDraftEdits[medalId],
    }

    if (!draft.name.trim() || !draft.slug.trim()) {
      setNotice({ text: 'У медали должны быть заполнены название и slug', type: 'error' })
      return
    }

    setPendingMedalId(medalId)
    const updated = await updateAchievement(medalId, {
      name: draft.name.trim(),
      slug: draft.slug.trim().toLowerCase(),
      description: toNullable(draft.description),
      category: toNullable(draft.category),
      iconUrl: toNullable(draft.iconUrl),
      inactiveIconUrl: toNullable(draft.inactiveIconUrl),
      sortOrder: draft.sortOrder,
    })

    if (!updated) {
      setPendingMedalId(null)
      setNotice({ text: 'Не удалось обновить медаль', type: 'error' })
      return
    }

    const synced = await syncMedalTournament(medalId, draft.tournamentId)
    setPendingMedalId(null)

    if (!synced) {
      setNotice({ text: 'Не удалось обновить привязку медали к турниру', type: 'error' })
      return
    }

    setMedalDraftEdits((previous) => {
      const next = { ...previous }
      delete next[medalId]
      return next
    })
    setNotice({ text: 'Медаль обновлена', type: 'success' })
  }

  const handleDeleteMedal = async () => {
    if (deleteTarget === null || isDeleting) {
      return
    }

    setIsDeleting(true)
    const deleted = await deleteAchievement(deleteTarget)
    setIsDeleting(false)

    if (!deleted) {
      setNotice({ text: 'Не удалось удалить медаль', type: 'error' })
      return
    }

    setDeleteTarget(null)
    setNotice({ text: 'Медаль удалена', type: 'success' })
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Медали</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Для турнирных медалей указывай `category`, активную и неактивную иконку.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            label="Название"
            inputProps={{
              value: newMedal.name,
              onChange: (event) =>
                setNewMedal((previous) => ({
                  ...previous,
                  name: event.target.value,
                })),
            }}
          />
          <FormField
            label="Slug"
            inputProps={{
              value: newMedal.slug,
              onChange: (event) =>
                setNewMedal((previous) => ({
                  ...previous,
                  slug: event.target.value,
                })),
            }}
          />
          <FormField
            label="Категория"
            inputProps={{
              value: newMedal.category,
              onChange: (event) =>
                setNewMedal((previous) => ({
                  ...previous,
                  category: event.target.value,
                })),
              placeholder: 'month_grand_final',
            }}
          />
          <FormField
            as="select"
            label="Турнир"
            options={tournamentOptions}
            selectProps={{
              value: newMedal.tournamentId,
              onChange: (event) =>
                setNewMedal((previous) => ({
                  ...previous,
                  tournamentId: event.target.value,
                })),
            }}
          />
          <FormField
            label="Порядок"
            inputProps={{
              type: 'number',
              value: newMedal.sortOrder,
              onChange: (event) =>
                setNewMedal((previous) => ({
                  ...previous,
                  sortOrder: Number(event.target.value || 0),
                })),
            }}
          />
          <FormField
            label="Icon URL"
            inputProps={{
              value: newMedal.iconUrl,
              onChange: (event) =>
                setNewMedal((previous) => ({
                  ...previous,
                  iconUrl: event.target.value,
                })),
            }}
          />
          <FormField
            label="Inactive icon URL"
            inputProps={{
              value: newMedal.inactiveIconUrl,
              onChange: (event) =>
                setNewMedal((previous) => ({
                  ...previous,
                  inactiveIconUrl: event.target.value,
                })),
            }}
          />
          <div className="md:col-span-2 xl:col-span-4">
            <FormField
              as="textarea"
              label="Описание"
              textareaProps={{
                rows: 3,
                value: newMedal.description,
                onChange: (event) =>
                  setNewMedal((previous) => ({
                    ...previous,
                    description: event.target.value,
                  })),
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleCreateMedal()}
          disabled={isCreating}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? 'Добавляем медаль...' : 'Добавить медаль'}
        </button>
      </section>

      <section className="space-y-3">
        {[...state.achievements]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((medal) => {
            const draft = {
              ...medalBaseDrafts[medal.id],
              ...medalDraftEdits[medal.id],
            }

            return (
              <div key={medal.id} className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-['Space_Grotesk'] text-xl font-bold">{medal.name}</h2>
                    <p className="text-xs text-[var(--text-muted)]">Создано: {formatDateTime(medal.createdAt)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveMedal(medal.id)}
                      disabled={pendingMedalId === medal.id}
                      className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingMedalId === medal.id ? 'Сохраняем...' : 'Сохранить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(medal.id)}
                      disabled={pendingMedalId === medal.id}
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
                      onChange: (event) => patchMedalDraft(medal.id, { name: event.target.value }),
                    }}
                  />
                  <FormField
                    label="Slug"
                    inputProps={{
                      value: draft.slug,
                      onChange: (event) => patchMedalDraft(medal.id, { slug: event.target.value }),
                    }}
                  />
                  <FormField
                    label="Категория"
                    inputProps={{
                      value: draft.category,
                      onChange: (event) =>
                        patchMedalDraft(medal.id, {
                          category: event.target.value,
                        }),
                    }}
                  />
                  <FormField
                    as="select"
                    label="Турнир"
                    options={tournamentOptions}
                    selectProps={{
                      value: draft.tournamentId,
                      onChange: (event) =>
                        patchMedalDraft(medal.id, {
                          tournamentId: event.target.value,
                        }),
                    }}
                  />
                  <FormField
                    label="Порядок"
                    inputProps={{
                      type: 'number',
                      value: draft.sortOrder,
                      onChange: (event) =>
                        patchMedalDraft(medal.id, {
                          sortOrder: Number(event.target.value || 0),
                        }),
                    }}
                  />
                  <FormField
                    label="Icon URL"
                    inputProps={{
                      value: draft.iconUrl,
                      onChange: (event) =>
                        patchMedalDraft(medal.id, {
                          iconUrl: event.target.value,
                        }),
                    }}
                  />
                  <FormField
                    label="Inactive icon URL"
                    inputProps={{
                      value: draft.inactiveIconUrl,
                      onChange: (event) =>
                        patchMedalDraft(medal.id, {
                          inactiveIconUrl: event.target.value,
                        }),
                    }}
                  />
                  <div className="md:col-span-2 xl:col-span-4">
                    <FormField
                      as="textarea"
                      label="Описание"
                      textareaProps={{
                        rows: 3,
                        value: draft.description,
                        onChange: (event) =>
                          patchMedalDraft(medal.id, {
                            description: event.target.value,
                          }),
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ImagePreview label="Active preview" src={draft.iconUrl} />
                  <ImagePreview label="Inactive preview" src={draft.inactiveIconUrl} />
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
        title="Удалить медаль?"
        description="Медаль будет удалена у всех пользователей и отвязана от отображаемых медалей."
        confirmLabel="Удалить"
        confirmPendingLabel="Удаляем..."
        pending={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteMedal()}
      />
    </div>
  )
}
