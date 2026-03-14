import { useEffect, useMemo, useState } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { formatDateInput } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'

type SeriesDraft = {
  name: string
  startDate: string
  endDate: string
}

export function SeriesPage() {
  const { state, createSeries, updateSeries, activateSeries, deleteSeries } = useAdminData()

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingActivateId, setPendingActivateId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingSeriesId, setPendingSeriesId] = useState<number | null>(null)
  const [seriesDraftEdits, setSeriesDraftEdits] = useState<Record<number, Partial<SeriesDraft>>>({})

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notice])

  const rows = useMemo(
    () => [...state.series].sort((a, b) => new Date(b.startDate).valueOf() - new Date(a.startDate).valueOf()),
    [state.series],
  )

  const seriesBaseDrafts = useMemo(
    () =>
      Object.fromEntries(
        state.series.map((item) => [
          item.id,
          {
            name: item.name,
            startDate: formatDateInput(item.startDate),
            endDate: formatDateInput(item.endDate),
          },
        ]),
      ) as Record<number, SeriesDraft>,
    [state.series],
  )

  const handleCreate = async () => {
    if (isCreating) {
      return
    }

    if (!name.trim() || !startDate || !endDate) {
      setNotice({ text: 'Заполни название и даты серии', type: 'error' })
      return
    }

    setIsCreating(true)
    const created = await createSeries({
      name: name.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    })
    setIsCreating(false)

    if (!created) {
      setNotice({ text: 'Не удалось создать серию', type: 'error' })
      return
    }

    setName('')
    setStartDate('')
    setEndDate('')
    setNotice({ text: 'Серия создана', type: 'success' })
  }

  const handleActivate = async (seriesId: number) => {
    if (pendingActivateId !== null) {
      return
    }

    setPendingActivateId(seriesId)
    const activated = await activateSeries(seriesId)
    setPendingActivateId(null)

    setNotice(
      activated
        ? { text: 'Серия активирована', type: 'success' }
        : { text: 'Не удалось активировать серию', type: 'error' },
    )
  }

  const handleDelete = async () => {
    if (deleteId === null || isDeleting) {
      return
    }

    setIsDeleting(true)
    const deleted = await deleteSeries(deleteId)
    setIsDeleting(false)

    if (!deleted) {
      setNotice({ text: 'Не удалось удалить серию', type: 'error' })
      return
    }

    setDeleteId(null)
    setNotice({ text: 'Серия удалена', type: 'success' })
  }

  const patchSeriesDraft = (seriesId: number, patch: Partial<SeriesDraft>) => {
    setSeriesDraftEdits((previous) => ({
      ...previous,
      [seriesId]: {
        ...(previous[seriesId] ?? seriesBaseDrafts[seriesId]),
        ...patch,
      },
    }))
  }

  const handleSaveSeries = async (seriesId: number) => {
    if (pendingSeriesId !== null) {
      return
    }

    const draft = {
      ...seriesBaseDrafts[seriesId],
      ...seriesDraftEdits[seriesId],
    }

    if (!draft.name.trim() || !draft.startDate || !draft.endDate) {
      setNotice({ text: 'У серии должны быть заполнены название и даты', type: 'error' })
      return
    }

    setPendingSeriesId(seriesId)
    const updated = await updateSeries(seriesId, {
      name: draft.name.trim(),
      startDate: new Date(draft.startDate).toISOString(),
      endDate: new Date(draft.endDate).toISOString(),
    })
    setPendingSeriesId(null)

    if (!updated) {
      setNotice({ text: 'Не удалось обновить серию', type: 'error' })
      return
    }

    setSeriesDraftEdits((previous) => {
      const next = { ...previous }
      delete next[seriesId]
      return next
    })
    setNotice({ text: 'Серия обновлена', type: 'success' })
  }

  return (
    <div className="space-y-4">
      <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Серии</h1>

      <div className="grid gap-4 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm md:grid-cols-4">
        <FormField
          label="Название"
          inputProps={{ value: name, onChange: (event) => setName(event.target.value), placeholder: 'Новая серия' }}
        />
        <FormField
          label="Дата начала"
          inputProps={{ type: 'date', value: startDate, onChange: (event) => setStartDate(event.target.value) }}
        />
        <FormField
          label="Дата конца"
          inputProps={{ type: 'date', value: endDate, onChange: (event) => setEndDate(event.target.value) }}
        />

        <div className="self-end">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isCreating}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? 'Создаем...' : 'Создать'}
          </button>
        </div>
      </div>

      <DataTable
        rows={rows}
        getRowKey={(row) => row.id}
        columns={[
          {
            header: 'Название',
            render: (row) => {
              const draft = {
                ...seriesBaseDrafts[row.id],
                ...seriesDraftEdits[row.id],
              }

              return (
                <input
                  value={draft.name}
                  onChange={(event) => patchSeriesDraft(row.id, { name: event.target.value })}
                  className="w-full rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
                />
              )
            },
          },
          {
            header: 'Период',
            render: (row) => {
              const draft = {
                ...seriesBaseDrafts[row.id],
                ...seriesDraftEdits[row.id],
              }

              return (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(event) =>
                      patchSeriesDraft(row.id, {
                        startDate: event.target.value,
                      })
                    }
                    className="rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
                  />
                  <span>—</span>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(event) =>
                      patchSeriesDraft(row.id, {
                        endDate: event.target.value,
                      })
                    }
                    className="rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )
            },
          },
          {
            header: 'Статус',
            render: (row) =>
              row.isActive ? (
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  Активная
                </span>
              ) : (
                <span className="text-sm text-[var(--text-muted)]">Неактивная</span>
              ),
          },
          {
            header: '',
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => void handleSaveSeries(row.id)}
                  disabled={pendingSeriesId === row.id}
                  className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingSeriesId === row.id ? 'Сохраняем...' : 'Сохранить'}
                </button>
                {!row.isActive ? (
                  <button
                    type="button"
                    onClick={() => void handleActivate(row.id)}
                    disabled={pendingActivateId === row.id || pendingSeriesId === row.id}
                    className="rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingActivateId === row.id ? 'Активируем...' : 'Активировать'}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setDeleteId(row.id)}
                  disabled={pendingSeriesId === row.id}
                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Удалить
                </button>
              </div>
            ),
          },
        ]}
      />

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
        open={deleteId !== null}
        title="Удалить серию?"
        description="Серия будет удалена. Это возможно только если к ней не привязаны турниры."
        confirmLabel="Удалить"
        confirmPendingLabel="Удаляем..."
        pending={isDeleting}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
