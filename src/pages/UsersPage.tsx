import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'

export function UsersPage() {
  const { state, getStatusById } = useAdminData()
  const [query, setQuery] = useState('')
  const [prepayFilter, setPrepayFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_desc')

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return state.users
      .filter((item) => {
        if (!normalized) {
          return true
        }

        return (
          item.login.toLowerCase().includes(normalized) ||
          (item.telegramUsername ?? '').toLowerCase().includes(normalized) ||
          item.name.toLowerCase().includes(normalized) ||
          String(item.id).includes(normalized)
        )
      })
      .filter((item) => {
        if (prepayFilter === 'never') {
          return item.isPrepayExempt
        }

        if (prepayFilter === 'required') {
          return item.isPrepayRequired
        }

        if (prepayFilter === 'not_required') {
          return !item.isPrepayRequired
        }

        if (statusFilter === 'none') {
          return item.statusId === null
        }

        if (statusFilter !== 'all') {
          return String(item.statusId ?? '') === statusFilter
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'created_desc') {
          return new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()
        }

        if (sortBy === 'created_asc') {
          return new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf()
        }

        if (sortBy === 'login_asc') {
          return (a.login ?? '').localeCompare(b.login ?? '', 'ru')
        }

        if (sortBy === 'name_asc') {
          return (a.name ?? '').localeCompare(b.name ?? '', 'ru')
        }

        return a.id - b.id
      })
  }, [prepayFilter, query, sortBy, state.users, statusFilter])

  return (
    <div className="space-y-4">
      <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Юзеры</h1>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск по нику, @username, имени или ID"
        className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-indigo-100 md:w-96"
      />

      <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm md:grid-cols-3">
        <FormField
          as="select"
          label="Предоплата"
          options={[
            { value: 'all', label: 'Все' },
            { value: 'required', label: 'Требуется' },
            { value: 'never', label: 'Никогда' },
            { value: 'not_required', label: 'Не требуется' },
          ]}
          selectProps={{ value: prepayFilter, onChange: (event) => setPrepayFilter(event.target.value) }}
        />
        <FormField
          as="select"
          label="Статус"
          options={[
            { value: 'all', label: 'Все статусы' },
            { value: 'none', label: 'Без статуса' },
            ...state.statuses.map((item) => ({ value: String(item.id), label: item.name })),
          ]}
          selectProps={{ value: statusFilter, onChange: (event) => setStatusFilter(event.target.value) }}
        />
        <FormField
          as="select"
          label="Сортировка"
          options={[
            { value: 'created_desc', label: 'Сначала новые' },
            { value: 'created_asc', label: 'Сначала старые' },
            { value: 'login_asc', label: 'По нику' },
            { value: 'name_asc', label: 'По имени' },
            { value: 'id_asc', label: 'По ID' },
          ]}
          selectProps={{ value: sortBy, onChange: (event) => setSortBy(event.target.value) }}
        />
      </div>

      <DataTable
        rows={rows}
        getRowKey={(row) => row.id}
        emptyLabel="Пользователи не найдены"
        columns={[
          { header: 'ID', render: (row) => <span className="font-mono text-xs text-[var(--text-muted)]">{row.id}</span> },
          {
            header: 'Ник',
            render: (row) => (
              <div className="space-y-0.5">
                <Link to={`/users/${row.id}`} className="font-semibold text-[var(--accent)] hover:underline">
                  {row.login || '—'}
                </Link>
                <div className="text-xs text-[var(--text-muted)]">
                  {row.telegramUsername ? `@${row.telegramUsername}` : 'Без username'}
                </div>
              </div>
            ),
          },
          { header: 'Имя', render: (row) => row.name },
          {
            header: 'Статус',
            render: (row) => {
              const status = getStatusById(row.statusId)
              return status ? <StatusBadge status={status.slug} /> : <span className="text-xs text-[var(--text-muted)]">—</span>
            },
          },
          {
            header: 'Предоплата',
            render: (row) =>
              row.isPrepayExempt ? (
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  Никогда
                </span>
              ) : row.isPrepayRequired ? (
                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  Требуется
                </span>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">—</span>
              ),
          },
          {
            header: 'Дата регистрации',
            render: (row) => <span className="text-xs text-[var(--text-muted)]">{formatDateTime(row.createdAt)}</span>,
          },
        ]}
      />
    </div>
  )
}
