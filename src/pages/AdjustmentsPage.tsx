import { useEffect, useMemo, useState } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { SearchableSelect } from '../components/SearchableSelect'
import { formatDateTime } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'

export function AdjustmentsPage() {
  const { state, createAdjustment, deleteAdjustment } = useAdminData()

  const [userId, setUserId] = useState('none')
  const [seriesId, setSeriesId] = useState('none')
  const [points, setPoints] = useState(0)
  const [bounty, setBounty] = useState(0)
  const [reason, setReason] = useState('')

  const [filterUserId, setFilterUserId] = useState('all')
  const [filterSeriesId, setFilterSeriesId] = useState('all')
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notice])

  const rows = useMemo(() => {
    return state.adjustments
      .filter((item) => {
        if (filterUserId !== 'all' && item.userId !== Number(filterUserId)) {
          return false
        }

        if (filterSeriesId !== 'all' && item.seriesId !== Number(filterSeriesId)) {
          return false
        }

        return true
      })
      .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
  }, [filterSeriesId, filterUserId, state.adjustments])

  const handleCreate = async () => {
    if (isCreating) {
      return
    }

    if (userId === 'none' || seriesId === 'none') {
      setNotice({ text: 'Заполни юзера и серию', type: 'error' })
      return
    }

    setIsCreating(true)
    const created = await createAdjustment({
      userId: Number(userId),
      seriesId: Number(seriesId),
      points,
      bounty,
      reason: reason.trim(),
    })
    setIsCreating(false)

    if (!created) {
      setNotice({ text: 'Не удалось добавить корректировку', type: 'error' })
      return
    }

    setPoints(0)
    setBounty(0)
    setReason('')
    setNotice({ text: 'Корректировка добавлена', type: 'success' })
  }

  const handleDelete = async () => {
    if (deleteId === null || isDeleting) {
      return
    }

    setIsDeleting(true)
    const deleted = await deleteAdjustment(deleteId)
    setIsDeleting(false)

    if (!deleted) {
      setNotice({ text: 'Не удалось отменить корректировку', type: 'error' })
      return
    }

    setDeleteId(null)
    setNotice({ text: 'Корректировка отменена', type: 'success' })
  }

  return (
    <div className="space-y-4">
      <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Корректировки</h1>

      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <SearchableSelect
            label="Юзер"
            options={[
              { value: 'none', label: 'Выбери пользователя' },
              ...state.users.map((item) => ({ value: String(item.id), label: `${item.login} (${item.name})` })),
            ]}
            value={userId}
            onChange={setUserId}
            placeholder="Поиск по нику..."
          />

          <FormField
            as="select"
            label="Серия"
            options={[
              { value: 'none', label: 'Выбери серию' },
              ...state.series.map((item) => ({ value: String(item.id), label: item.name })),
            ]}
            selectProps={{ value: seriesId, onChange: (event) => setSeriesId(event.target.value) }}
          />

          <FormField
            label="Очки"
            inputProps={{
              type: 'number',
              value: points,
              onChange: (event) => setPoints(Number(event.target.value || 0)),
            }}
          />

          <FormField
            label="Баунти"
            inputProps={{
              type: 'number',
              value: bounty,
              onChange: (event) => setBounty(Number(event.target.value || 0)),
            }}
          />
        </div>

        <FormField
          as="textarea"
          label="Причина"
          textareaProps={{
            rows: 3,
            value: reason,
            onChange: (event) => setReason(event.target.value),
            placeholder: 'Необязательно',
          }}
        />

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={isCreating}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? 'Добавляем...' : 'Добавить'}
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm md:grid-cols-2">
        <SearchableSelect
          label="Фильтр: юзер"
          options={[
            { value: 'all', label: 'Все' },
            ...state.users.map((item) => ({ value: String(item.id), label: `${item.login} (${item.name})` })),
          ]}
          value={filterUserId}
          onChange={setFilterUserId}
          placeholder="Поиск по нику..."
        />

        <FormField
          as="select"
          label="Фильтр: серия"
          options={[
            { value: 'all', label: 'Все' },
            ...state.series.map((item) => ({ value: String(item.id), label: item.name })),
          ]}
          selectProps={{
            value: filterSeriesId,
            onChange: (event) => setFilterSeriesId(event.target.value),
          }}
        />
      </div>

      <DataTable
        rows={rows}
        getRowKey={(row) => row.id}
        emptyLabel="Корректировки не найдены"
        columns={[
          {
            header: 'Юзер',
            render: (row) => state.users.find((item) => item.id === row.userId)?.login ?? row.userId,
          },
          {
            header: 'Серия',
            render: (row) =>
              state.series.find((item) => item.id === row.seriesId)?.name ?? row.seriesId,
          },
          { header: 'Очки', render: (row) => row.points },
          { header: 'Баунти', render: (row) => row.bounty },
          { header: 'Причина', render: (row) => row.reason },
          { header: 'Дата', render: (row) => formatDateTime(row.createdAt) },
          {
            header: '',
            render: (row) => (
              <button
                type="button"
                onClick={() => setDeleteId(row.id)}
                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                Отменить
              </button>
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
        title="Отменить корректировку?"
        description="Корректировка будет удалена, рейтинг пересчитан."
        confirmLabel="Отменить"
        confirmPendingLabel="Отменяем..."
        pending={isDeleting}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
