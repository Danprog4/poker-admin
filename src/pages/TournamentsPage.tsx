import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../lib/date'
import { useToast } from '../providers/ToastProvider'
import { useAdminData } from '../providers/useAdminData'

const statusOptions: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'upcoming', label: 'Предстоящие' },
  { value: 'ongoing', label: 'Идущие' },
  { value: 'completed', label: 'Завершённые' },
  { value: 'cancelled', label: 'Отменённые' },
]

const sortOptions: Array<{ value: string; label: string }> = [
  { value: 'event_date_desc', label: 'Сначала по дате турнира' },
  { value: 'created_at_desc', label: 'Сначала по дате создания' },
]

export function TournamentsPage() {
  const { state, getSeriesById, deleteTournament } = useAdminData()
  const { success, error } = useToast()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [seriesFilter, setSeriesFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('event_date_desc')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const rows = useMemo(() => {
    return state.tournaments
      .filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) {
          return false
        }

        if (seriesFilter !== 'all' && String(item.seriesId ?? '') !== seriesFilter) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'created_at_desc') {
          return new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()
        }

        return new Date(b.date).valueOf() - new Date(a.date).valueOf()
      })
  }, [seriesFilter, sortBy, state.tournaments, statusFilter])

  const handleDelete = async () => {
    if (deleteId === null || isDeleting) {
      return
    }

    setIsDeleting(true)
    const deleted = await deleteTournament(deleteId)
    setIsDeleting(false)

    if (!deleted) {
      error('Не удалось удалить турнир')
      return
    }

    setDeleteId(null)
    success('Турнир удалён')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Турниры</h1>
        <Link
          to="/tournaments/new"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
        >
          Создать турнир
        </Link>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm md:grid-cols-3">
        <FormField
          as="select"
          label="Фильтр по статусу"
          options={statusOptions}
          selectProps={{
            value: statusFilter,
            onChange: (event) => setStatusFilter(event.target.value),
          }}
        />

        <FormField
          as="select"
          label="Фильтр по серии"
          options={[
            { value: 'all', label: 'Все серии' },
            ...state.series.map((item) => ({ value: String(item.id), label: item.name })),
          ]}
          selectProps={{
            value: seriesFilter,
            onChange: (event) => setSeriesFilter(event.target.value),
          }}
        />

        <FormField
          as="select"
          label="Сортировка"
          options={sortOptions}
          selectProps={{
            value: sortBy,
            onChange: (event) => setSortBy(event.target.value),
          }}
        />
      </div>

      <DataTable
        rows={rows}
        getRowKey={(row) => row.id}
        emptyLabel="Турниры не найдены"
        columns={[
          {
            header: 'Название',
            render: (row) => (
              <Link to={`/tournaments/${row.id}`} className="font-semibold text-[var(--accent)] hover:underline">
                {row.name}
              </Link>
            ),
          },
          {
            header: 'Дата',
            render: (row) => formatDateTime(row.date),
          },
          {
            header: 'Статус',
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            header: 'Записано/макс',
            render: (row) => {
              const activeRegistrations = state.registrations.filter(
                (item) => item.tournamentId === row.id && item.status !== 'cancelled',
              ).length

              return `${activeRegistrations} / ${row.maxPlayers}`
            },
          },
          {
            header: 'Серия',
            render: (row) => getSeriesById(row.seriesId)?.name ?? <span className="text-[var(--text-muted)]">—</span>,
          },
          {
            header: 'Медаль',
            render: (row) =>
              state.achievements.find((item) => item.id === row.medalId)?.name ?? (
                <span className="text-[var(--text-muted)]">—</span>
              ),
          },
          {
            header: 'Значимый',
            render: (row) =>
              row.isSignificant ? (
                <span className="text-xs font-semibold text-amber-700">Да</span>
              ) : (
                <span className="text-[var(--text-muted)]">Нет</span>
              ),
          },
          {
            header: '',
            render: (row) => {
              const canDelete =
                row.status === 'upcoming' &&
                !state.registrations.some(
                  (item) => item.tournamentId === row.id && item.status !== 'cancelled',
                )

              if (!canDelete) {
                return null
              }

              return (
                <button
                  type="button"
                  onClick={() => setDeleteId(row.id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Удалить
                </button>
              )
            },
          },
        ]}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Удалить турнир?"
        description="Это действие нельзя отменить. Турнир будет удалён из системы."
        confirmLabel="Удалить"
        confirmPendingLabel="Удаляем..."
        pending={isDeleting}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
