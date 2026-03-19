import { useMemo, useState } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { formatDateInput } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'
import { useToast } from '../providers/ToastProvider'

type SeriesDraft = {
  name: string
  month: string
}

const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

function createMonthOptions() {
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  return years.flatMap((year) =>
    MONTHS_RU.map((label, monthIndex) => ({
      value: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      label: `${label} ${year}`,
    })),
  )
}

function getMonthValue(date: string) {
  return formatDateInput(date).slice(0, 7)
}

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const start = new Date(year, monthNumber - 1, 1)
  const end = new Date(year, monthNumber, 0)

  return {
    startDate: formatDateInput(start.toISOString()),
    endDate: formatDateInput(end.toISOString()),
  }
}

function getMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return `${MONTHS_RU[monthNumber - 1]} ${year}`
}

export function SeriesPage() {
  const { state, createSeries, updateSeries, activateSeries, deleteSeries } = useAdminData()
  const { success, error } = useToast()

  const [name, setName] = useState('')
  const [month, setMonth] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingActivateId, setPendingActivateId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingSeriesId, setPendingSeriesId] = useState<number | null>(null)
  const [seriesDraftEdits, setSeriesDraftEdits] = useState<Record<number, Partial<SeriesDraft>>>({})

  const rows = useMemo(
    () => [...state.series].sort((a, b) => new Date(b.startDate).valueOf() - new Date(a.startDate).valueOf()),
    [state.series],
  )
  const monthOptions = useMemo(() => createMonthOptions(), [])

  const seriesBaseDrafts = useMemo(
    () =>
      Object.fromEntries(
        state.series.map((item) => [
          item.id,
          {
            name: item.name,
            month: getMonthValue(item.startDate),
          },
        ]),
      ) as Record<number, SeriesDraft>,
    [state.series],
  )

  const handleCreate = async () => {
    if (isCreating) {
      return
    }

    if (!name.trim() || !month) {
      error('Заполни название и выбери месяц серии')
      return
    }

    const range = getMonthRange(month)

    setIsCreating(true)
    const created = await createSeries({
      name: name.trim(),
      startDate: range.startDate,
      endDate: range.endDate,
    })
    setIsCreating(false)

    if (!created) {
      error('Не удалось создать серию')
      return
    }

    setName('')
    setMonth('')
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

    if (!draft.name.trim() || !draft.month) {
      error('У серии должны быть заполнены название и месяц')
      return
    }

    const range = getMonthRange(draft.month)

    setPendingSeriesId(seriesId)
    const updated = await updateSeries(seriesId, {
      name: draft.name.trim(),
      startDate: range.startDate,
      endDate: range.endDate,
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

  return (
    <div className="space-y-4">
      <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Серии</h1>

      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
        <p className="text-sm text-[var(--text-muted)]">
          Серии создаются автоматически каждый месяц. Здесь можно заранее
          добавить новую серию или подправить существующую вручную.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="Название"
          inputProps={{ value: name, onChange: (event) => setName(event.target.value), placeholder: 'Новая серия' }}
        />
        <FormField
          as="select"
          label="Месяц"
          options={[
            { value: '', label: 'Выбери месяц' },
            ...monthOptions,
          ]}
          selectProps={{ value: month, onChange: (event) => setMonth(event.target.value) }}
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
                  onChange={(event) => patchSeriesDraft(row.id, { name: event.target.value })}
                  className="w-full rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
                />
              )
            },
          },
          {
            header: 'Месяц',
            render: (row) => {
              const draft = {
                ...seriesBaseDrafts[row.id],
                ...seriesDraftEdits[row.id],
              }

              return (
                <div className="space-y-1">
                  <select
                    value={draft.month}
                    onChange={(event) =>
                      patchSeriesDraft(row.id, {
                        month: event.target.value,
                      })
                    }
                    className="rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Выбери месяц</option>
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--text-muted)]">
                    {draft.month ? getMonthLabel(draft.month) : 'Месяц не выбран'}
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
