import { useMemo, useState } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { formatDateInput } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'
import { useToast } from '../providers/ToastProvider'

type SeriesDraft = {
  name: string
  startDate: string
  endDate: string
}

function normalizeDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return null
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return null
  }

  if (start.valueOf() > end.valueOf()) {
    return null
  }

  return { startDate, endDate }
}

function formatSeriesDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function getCurrentWeekRange(weekOffset = 0) {
  const now = new Date()
  const dayIndex = (now.getDay() + 6) % 7
  const start = new Date(now)

  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - dayIndex + weekOffset * 7)

  const end = new Date(start)

  end.setDate(end.getDate() + 6)

  return {
    startDate: formatDateInput(start.toISOString()),
    endDate: formatDateInput(end.toISOString()),
  }
}

function getCurrentMonthRange(monthOffset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0)

  return {
    startDate: formatDateInput(start.toISOString()),
    endDate: formatDateInput(end.toISOString()),
  }
}

export function SeriesPage() {
  const {
    state,
    ratingsBySeriesId,
    createSeries,
    updateSeries,
    activateSeries,
    deleteSeries,
  } = useAdminData()
  const { success, error } = useToast()

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingActivateId, setPendingActivateId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingSeriesId, setPendingSeriesId] = useState<number | null>(null)
  const [copyingSeriesId, setCopyingSeriesId] = useState<number | null>(null)
  const [seriesDraftEdits, setSeriesDraftEdits] = useState<
    Record<number, Partial<SeriesDraft>>
  >({})

  const rows = useMemo(
    () =>
      [...state.series].sort(
        (a, b) =>
          new Date(b.startDate).valueOf() - new Date(a.startDate).valueOf(),
      ),
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

  const fillCreateRange = (nextRange: { startDate: string; endDate: string }) => {
    setStartDate(nextRange.startDate)
    setEndDate(nextRange.endDate)
  }

  const handleCreate = async () => {
    if (isCreating) {
      return
    }

    const normalizedRange = normalizeDateRange(startDate, endDate)

    if (!name.trim() || !normalizedRange) {
      error('Заполни название и корректный диапазон дат серии')
      return
    }

    setIsCreating(true)
    const created = await createSeries({
      name: name.trim(),
      startDate: normalizedRange.startDate,
      endDate: normalizedRange.endDate,
    })
    setIsCreating(false)

    if (!created) {
      error('Не удалось создать серию')
      return
    }

    setName('')
    setStartDate('')
    setEndDate('')
    success('Изменения применены')
  }

  const handleActivate = async (seriesId: number) => {
    if (pendingActivateId !== null) {
      return
    }

    setPendingActivateId(seriesId)
    const activated = await activateSeries(seriesId)
    setPendingActivateId(null)

    if (activated) {
      success('Изменения применены')
      return
    }

    error('Не удалось активировать серию')
  }

  const handleDelete = async () => {
    if (deleteId === null || isDeleting) {
      return
    }

    setIsDeleting(true)
    const deleted = await deleteSeries(deleteId)
    setIsDeleting(false)

    if (!deleted) {
      error('Не удалось удалить серию')
      return
    }

    setDeleteId(null)
    success('Изменения применены')
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
    const normalizedRange = normalizeDateRange(draft.startDate, draft.endDate)

    if (!draft.name.trim() || !normalizedRange) {
      error('У серии должны быть название и корректный диапазон дат')
      return
    }

    setPendingSeriesId(seriesId)
    const updated = await updateSeries(seriesId, {
      name: draft.name.trim(),
      startDate: normalizedRange.startDate,
      endDate: normalizedRange.endDate,
    })
    setPendingSeriesId(null)

    if (!updated) {
      error('Не удалось обновить серию')
      return
    }

    setSeriesDraftEdits((previous) => {
      const next = { ...previous }
      delete next[seriesId]
      return next
    })
    success('Изменения применены')
  }

  const handleCopyRating = async (seriesId: number) => {
    if (copyingSeriesId !== null) {
      return
    }

    const rows = ratingsBySeriesId[seriesId] ?? []

    if (rows.length === 0) {
      error('Для этой серии пока нет рейтинга')
      return
    }

    const text = rows
      .map(
        (row) => `${row.rank}. ${row.login} - ${row.totalPoints} - ${row.totalBounty}`,
      )
      .join('\n')

    setCopyingSeriesId(seriesId)

    try {
      await navigator.clipboard.writeText(text)
      success('Рейтинг скопирован')
    } catch (cause) {
      console.error(cause)
      error('Не удалось скопировать рейтинг')
    } finally {
      setCopyingSeriesId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Серии</h1>

      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
        <p className="text-sm text-[var(--text-muted)]">
          Серии можно вести как помесячно, так и понедельно. Очки попадают в ту
          серию, которая выбрана у турнира. Активная серия нужна как значение по
          умолчанию для новых действий в админке.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fillCreateRange(getCurrentWeekRange())}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
          >
            Эта неделя
          </button>
          <button
            type="button"
            onClick={() => fillCreateRange(getCurrentWeekRange(1))}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
          >
            Следующая неделя
          </button>
          <button
            type="button"
            onClick={() => fillCreateRange(getCurrentMonthRange())}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
          >
            Этот месяц
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <FormField
            label="Название"
            inputProps={{
              value: name,
              onChange: (event) => setName(event.target.value),
              placeholder: 'Мартовская 1 неделя',
            }}
          />
          <FormField
            label="Дата начала"
            inputProps={{
              type: 'date',
              value: startDate,
              onChange: (event) => setStartDate(event.target.value),
            }}
          />
          <FormField
            label="Дата конца"
            inputProps={{
              type: 'date',
              value: endDate,
              onChange: (event) => setEndDate(event.target.value),
            }}
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
                  onChange={(event) =>
                    patchSeriesDraft(row.id, { name: event.target.value })
                  }
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
                <div className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-2">
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
                  <p className="text-xs text-[var(--text-muted)]">
                    {draft.startDate && draft.endDate
                      ? `${formatSeriesDate(draft.startDate)} - ${formatSeriesDate(draft.endDate)}`
                      : 'Период не задан'}
                  </p>
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
                <span className="text-sm text-[var(--text-muted)]">
                  Неактивная
                </span>
              ),
          },
          {
            header: 'Рейтинг',
            render: (row) => {
              const ratingRows = ratingsBySeriesId[row.id] ?? []

              return ratingRows.length > 0 ? (
                <span className="text-sm text-[var(--text-primary)]">
                  {ratingRows.length} игроков
                </span>
              ) : (
                <span className="text-sm text-[var(--text-muted)]">Пусто</span>
              )
            },
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
                    disabled={
                      pendingActivateId === row.id || pendingSeriesId === row.id
                    }
                    className="rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingActivateId === row.id
                      ? 'Активируем...'
                      : 'Активировать'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleCopyRating(row.id)}
                  disabled={copyingSeriesId === row.id}
                  className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copyingSeriesId === row.id
                    ? 'Копируем...'
                    : 'Скопировать рейтинг'}
                </button>

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
