import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'

export function BroadcastsPage() {
  const { state, deleteBroadcast } = useAdminData()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!notice) {
      return
    }

    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const rows = [...state.broadcasts].sort(
    (a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf(),
  )

  const handleDelete = async () => {
    if (deleteId === null || isDeleting) {
      return
    }

    setIsDeleting(true)
    const deleted = await deleteBroadcast(deleteId)
    setIsDeleting(false)

    if (!deleted) {
      setNotice({ text: 'Не удалось удалить черновик', type: 'error' })
      return
    }

    setDeleteId(null)
    setNotice({ text: 'Черновик удалён', type: 'success' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Рассылки</h1>
        <Link
          to="/broadcasts/new"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
        >
          Создать рассылку
        </Link>
      </div>

      <DataTable
        rows={rows}
        getRowKey={(row) => row.id}
        emptyLabel="Рассылок пока нет"
        columns={[
          {
            header: 'Сообщение',
            render: (row) => (
              <Link to={`/broadcasts/${row.id}`} className="font-semibold text-[var(--accent)] hover:underline">
                {row.message.slice(0, 80)}{row.message.length > 80 ? '...' : ''}
              </Link>
            ),
          },
          { header: 'Фильтр', render: (row) => row.targetFilter },
          { header: 'Отправлено', render: (row) => row.sentCount },
          {
            header: 'Статус',
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            header: 'Создано',
            render: (row) => <span className="text-xs text-[var(--text-muted)]">{formatDateTime(row.createdAt)}</span>,
          },
          {
            header: '',
            render: (row) => {
              if (row.status !== 'draft') {
                return null
              }

              return (
                <button
                  type="button"
                  onClick={() => setDeleteId(row.id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
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
        title="Удалить черновик?"
        description="Черновик рассылки будет удалён."
        confirmLabel="Удалить"
        confirmPendingLabel="Удаляем..."
        pending={isDeleting}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
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
    </div>
  )
}
