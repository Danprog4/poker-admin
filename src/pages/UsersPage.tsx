import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'

export function UsersPage() {
  const { state, getStatusById } = useAdminData()
  const [query, setQuery] = useState('')

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
      .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
  }, [query, state.users])

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
              row.isPrepayRequired ? (
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
