import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'

export function UserDetailsPage() {
  const { id } = useParams()
  const userId = Number(id)

  const {
    state,
    activeSeries,
    getUserById,
    getStatusById,
    getUserHistory,
    getUserAchievements,
    getUserAdjustments,
    setUserPrepay,
    setUserStatus,
    updateUserLogin,
    awardAchievement,
    revokeAchievement,
    createAdjustment,
  } = useAdminData()

  const user = getUserById(userId)

  const [login, setLogin] = useState('')
  const [statusId, setStatusId] = useState<string>('none')
  const [prepay, setPrepay] = useState('false')
  const [selectedAchievementId, setSelectedAchievementId] = useState('none')
  const [seriesId, setSeriesId] = useState('none')
  const [points, setPoints] = useState(0)
  const [bounty, setBounty] = useState(0)
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<{ userId: number; achievementId: number } | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isAwarding, setIsAwarding] = useState(false)
  const [isAddingAdjustment, setIsAddingAdjustment] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  // Sync from server
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogin(user.login)
      setStatusId(user.statusId ? String(user.statusId) : 'none')
      setPrepay(user.isPrepayRequired ? 'true' : 'false')
    }
  }, [user])

  useEffect(() => {
    if (activeSeries && seriesId === 'none') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeriesId(String(activeSeries.id))
    }
  }, [activeSeries, seriesId])

  // Auto-dismiss notices
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notice])

  const userHistory = useMemo(() => (user ? getUserHistory(user.id) : []), [getUserHistory, user])
  const userAchievements = useMemo(
    () => (user ? getUserAchievements(user.id) : []),
    [getUserAchievements, user],
  )
  const userAdjustments = useMemo(
    () => (user ? getUserAdjustments(user.id) : []),
    [getUserAdjustments, user],
  )

  if (!user) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--text-muted)]">
        Пользователь не найден
      </div>
    )
  }

  const selectedStatus = getStatusById(user.statusId)

  const handleSaveProfile = async () => {
    if (isSavingProfile) {
      return
    }

    setIsSavingProfile(true)

    if (login.trim() !== user.login) {
      const loginUpdated = await updateUserLogin(user.id, login.trim())

      if (!loginUpdated) {
        setIsSavingProfile(false)
        setNotice({ text: 'Не удалось обновить ник пользователя', type: 'error' })
        return
      }
    }

    const statusUpdated = await setUserStatus(user.id, statusId === 'none' ? null : Number(statusId))

    if (!statusUpdated) {
      setIsSavingProfile(false)
      setNotice({ text: 'Не удалось обновить статус пользователя', type: 'error' })
      return
    }

    const prepayUpdated = await setUserPrepay(user.id, prepay === 'true')
    setIsSavingProfile(false)

    if (!prepayUpdated) {
      setNotice({ text: 'Не удалось обновить флаг предоплаты', type: 'error' })
      return
    }

    setNotice({ text: 'Профиль обновлён', type: 'success' })
  }

  const handleAwardAchievement = async () => {
    if (isAwarding) {
      return
    }

    if (selectedAchievementId === 'none') {
      return
    }

    setIsAwarding(true)
    const awarded = await awardAchievement(user.id, Number(selectedAchievementId))
    setIsAwarding(false)

    if (!awarded) {
      setNotice({ text: 'Не удалось выдать ачивку', type: 'error' })
      return
    }

    setSelectedAchievementId('none')
    setNotice({ text: 'Ачивка выдана', type: 'success' })
  }

  const handleAddAdjustment = async () => {
    if (isAddingAdjustment) {
      return
    }

    if (seriesId === 'none' || !reason.trim()) {
      setNotice({ text: 'Выбери серию и укажи причину', type: 'error' })
      return
    }

    setIsAddingAdjustment(true)
    const created = await createAdjustment({
      userId: user.id,
      seriesId: Number(seriesId),
      points,
      bounty,
      reason: reason.trim(),
    })
    setIsAddingAdjustment(false)

    if (!created) {
      setNotice({ text: 'Не удалось добавить корректировку', type: 'error' })
      return
    }

    setPoints(0)
    setBounty(0)
    setReason('')
    setNotice({ text: 'Корректировка добавлена', type: 'success' })
  }

  const handleRevokeAchievement = async () => {
    if (!revokeTarget || isRevoking) {
      return
    }

    setIsRevoking(true)
    const revoked = await revokeAchievement(revokeTarget.userId, revokeTarget.achievementId)
    setIsRevoking(false)

    if (!revoked) {
      setNotice({ text: 'Не удалось отобрать ачивку', type: 'error' })
      return
    }

    setRevokeTarget(null)
    setNotice({ text: 'Ачивка отозвана', type: 'success' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link to="/users" className="hover:text-[var(--accent)]">Юзеры</Link>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{user.login}</span>
      </div>

      <section className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold">
            Профиль #{user.id}
          </h1>
          {selectedStatus ? <StatusBadge status={selectedStatus.slug} /> : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FormField
            label="Ник (login)"
            inputProps={{
              value: login,
              onChange: (event) => setLogin(event.target.value),
              placeholder: 'Никнейм пользователя',
            }}
          />
          <FormField
            label="Telegram username"
            inputProps={{
              value: user.telegramUsername ? `@${user.telegramUsername}` : '—',
              readOnly: true,
            }}
          />
          <FormField label="Имя" inputProps={{ value: user.name, readOnly: true }} />
          <FormField
            as="select"
            label="Статус"
            options={[
              { value: 'none', label: 'Без статуса' },
              ...state.statuses.map((item) => ({ value: String(item.id), label: item.name })),
            ]}
            selectProps={{ value: statusId, onChange: (event) => setStatusId(event.target.value) }}
          />
          <FormField
            as="select"
            label="Предоплата"
            options={[
              { value: 'false', label: 'Не требуется' },
              { value: 'true', label: 'Требуется' },
            ]}
            selectProps={{ value: prepay, onChange: (event) => setPrepay(event.target.value) }}
          />
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void handleSaveProfile()}
            disabled={isSavingProfile}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingProfile ? 'Сохраняем...' : 'Сохранить профиль'}
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="font-['Space_Grotesk'] text-xl font-bold">Ачивки</h2>

          <ul className="space-y-2">
            {userAchievements.length === 0 ? (
              <li className="rounded-lg border border-dashed border-[var(--line)] p-3 text-sm text-[var(--text-muted)]">
                У пользователя пока нет ачивок
              </li>
            ) : null}

            {userAchievements.map((item) => (
              <li
                key={item.link.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{item.achievement.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatDateTime(item.link.awardedAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRevokeTarget({ userId: user.id, achievementId: item.achievement.id })}
                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Отобрать
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <FormField
              as="select"
              label="Ачивка"
              options={[
                { value: 'none', label: 'Выбери ачивку' },
                ...state.achievements.map((item) => ({ value: String(item.id), label: item.name })),
              ]}
              selectProps={{
                value: selectedAchievementId,
                onChange: (event) => setSelectedAchievementId(event.target.value),
              }}
            />
            <div className="self-end">
              <button
                type="button"
                onClick={() => void handleAwardAchievement()}
                disabled={isAwarding}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAwarding ? 'Выдаем...' : 'Выдать'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="font-['Space_Grotesk'] text-xl font-bold">Ручная корректировка</h2>

          <FormField
            as="select"
            label="Серия"
            options={[
              { value: 'none', label: 'Выбери серию' },
              ...state.series.map((item) => ({ value: String(item.id), label: item.name })),
            ]}
            selectProps={{ value: seriesId, onChange: (event) => setSeriesId(event.target.value) }}
          />

          <div className="grid gap-3 md:grid-cols-2">
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
            textareaProps={{ value: reason, onChange: (event) => setReason(event.target.value), rows: 3 }}
          />

          <button
            type="button"
            onClick={() => void handleAddAdjustment()}
            disabled={isAddingAdjustment}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAddingAdjustment ? 'Добавляем...' : 'Добавить корректировку'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-['Space_Grotesk'] text-xl font-bold">История турниров</h2>
        <DataTable
          rows={userHistory}
          getRowKey={(row) => row.tournament.id}
          emptyLabel="История отсутствует"
          columns={[
            { header: 'Турнир', render: (row) => (
              <Link to={`/tournaments/${row.tournament.id}`} className="text-[var(--accent)] hover:underline">
                {row.tournament.name}
              </Link>
            )},
            { header: 'Дата', render: (row) => <span className="text-xs text-[var(--text-muted)]">{formatDateTime(row.tournament.date)}</span> },
            { header: 'Регистрация', render: (row) => row.registration ? <StatusBadge status={row.registration.status} /> : <span className="text-[var(--text-muted)]">—</span> },
            { header: 'Место', render: (row) => row.result?.place ?? '—' },
            { header: 'Очки', render: (row) => row.result?.points ?? '—' },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-['Space_Grotesk'] text-xl font-bold">История корректировок</h2>
        <DataTable
          rows={userAdjustments}
          getRowKey={(row) => row.id}
          emptyLabel="Корректировок пока нет"
          columns={[
            {
              header: 'Серия',
              render: (row) =>
                state.series.find((seriesItem) => seriesItem.id === row.seriesId)?.name ??
                `#${row.seriesId}`,
            },
            { header: 'Очки', render: (row) => row.points },
            { header: 'Баунти', render: (row) => row.bounty },
            { header: 'Причина', render: (row) => row.reason },
            { header: 'Дата', render: (row) => <span className="text-xs text-[var(--text-muted)]">{formatDateTime(row.createdAt)}</span> },
          ]}
        />
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
        open={revokeTarget !== null}
        title="Отобрать ачивку?"
        description="Ачивка будет удалена у пользователя."
        confirmLabel="Отобрать"
        confirmPendingLabel="Отзываем..."
        pending={isRevoking}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => void handleRevokeAchievement()}
      />
    </div>
  )
}
