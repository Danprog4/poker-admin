import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { SearchableSelect } from '../components/SearchableSelect'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../lib/date'
import { useToast } from '../providers/ToastProvider'
import { useAdminData } from '../providers/useAdminData'

function getDefaultPrepayMessage(_login: string) {
  return `Из-за отмены записи менее чем за 2 часа до турнира / неявки теперь для вас доступна запись только по предоплате. Напишите менеджеру.`
}

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
    addRegistration,
    setUserPrepay,
    setUserStatus,
    updateUserLogin,
    awardAchievement,
    revokeAchievement,
    createAdjustment,
  } = useAdminData()
  const { success, error } = useToast()

  const user = getUserById(userId)
  const [nowTs] = useState(() => Date.now())

  const [loginDraft, setLoginDraft] = useState<string | null>(null)
  const [statusIdDraft, setStatusIdDraft] = useState<string | null>(null)
  const [prepayDraft, setPrepayDraft] = useState<string | null>(null)
  const [prepayMessageDraft, setPrepayMessageDraft] = useState<string | null>(null)
  const [selectedTournamentId, setSelectedTournamentId] = useState('none')
  const [selectedAchievementId, setSelectedAchievementId] = useState('none')
  const [seriesIdDraft, setSeriesIdDraft] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [bounty, setBounty] = useState(0)
  const [reason, setReason] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<{ userId: number; achievementId: number } | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isAddingTournament, setIsAddingTournament] = useState(false)
  const [isAwarding, setIsAwarding] = useState(false)
  const [isAddingAdjustment, setIsAddingAdjustment] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  const userHistory = useMemo(() => (user ? getUserHistory(user.id) : []), [getUserHistory, user])
  const userAchievements = useMemo(
    () => (user ? getUserAchievements(user.id) : []),
    [getUserAchievements, user],
  )
  const userAdjustments = useMemo(
    () => (user ? getUserAdjustments(user.id) : []),
    [getUserAdjustments, user],
  )
  const availableTournaments = useMemo(() => {
    const activeTournamentIds = new Set(
      userHistory
        .filter(
          (item) =>
            item.registration &&
            item.registration.status !== 'cancelled' &&
            new Date(item.tournament.date).valueOf() > nowTs,
        )
        .map((item) => item.tournament.id),
    )

    return state.tournaments
      .filter((item) => {
        if (item.status === 'completed' || item.status === 'cancelled') {
          return false
        }

        if (new Date(item.date).valueOf() <= nowTs) {
          return false
        }

        return !activeTournamentIds.has(item.id)
      })
      .sort((a, b) => new Date(a.date).valueOf() - new Date(b.date).valueOf())
  }, [nowTs, state.tournaments, userHistory])

  if (!user) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--text-muted)]">
        Пользователь не найден
      </div>
    )
  }

  const login = loginDraft ?? user.login
  const statusId = statusIdDraft ?? (user.statusId ? String(user.statusId) : 'none')
  const prepay =
    prepayDraft ??
    (user.isPrepayExempt
      ? 'never'
      : user.isPrepayRequired
        ? 'required'
        : 'optional')
  const prepayMessage =
    prepayMessageDraft ?? getDefaultPrepayMessage(user.login || `Игрок ${user.id}`)
  const seriesId = seriesIdDraft ?? (activeSeries ? String(activeSeries.id) : 'none')
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
        error('Не удалось обновить ник пользователя')
        return
      }
    }

    const nextStatusId = statusId === 'none' ? null : Number(statusId)

    if (nextStatusId !== (user.statusId ?? null)) {
      const statusUpdated = await setUserStatus(user.id, nextStatusId)

      if (!statusUpdated) {
        setIsSavingProfile(false)
        error('Не удалось обновить статус пользователя')
        return
      }
    }

    const currentPrepayMode = user.isPrepayExempt
      ? 'never'
      : user.isPrepayRequired
        ? 'required'
        : 'optional'

    if (prepay !== currentPrepayMode) {
      const prepayUpdated = await setUserPrepay(
        user.id,
        prepay as 'required' | 'optional' | 'never',
        prepay === 'required' ? prepayMessage.trim() : undefined,
      )
      setIsSavingProfile(false)

      if (!prepayUpdated) {
        error('Не удалось обновить флаг предоплаты')
        return
      }
    } else {
      setIsSavingProfile(false)
    }

    success('Профиль обновлён')
  }

  const handleAddTournament = async () => {
    if (selectedTournamentId === 'none' || isAddingTournament) {
      return
    }

    setIsAddingTournament(true)
    const result = await addRegistration(Number(selectedTournamentId), user.id)
    setIsAddingTournament(false)

    if (!result.ok) {
      error(result.errorMessage ?? 'Не удалось записать пользователя на турнир')
      return
    }

    setSelectedTournamentId('none')
    success('Пользователь записан на турнир')
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
      error('Не удалось выдать ачивку')
      return
    }

    setSelectedAchievementId('none')
    success('Ачивка выдана')
  }

  const handleAddAdjustment = async () => {
    if (isAddingAdjustment) {
      return
    }

    if (seriesId === 'none') {
      error('Выбери серию для корректировки')
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
      error('Не удалось добавить корректировку')
      return
    }

    setPoints(0)
    setBounty(0)
    setReason('')
    success('Корректировка добавлена')
  }

  const handleRevokeAchievement = async () => {
    if (!revokeTarget || isRevoking) {
      return
    }

    setIsRevoking(true)
    const revoked = await revokeAchievement(revokeTarget.userId, revokeTarget.achievementId)
    setIsRevoking(false)

    if (!revoked) {
      error('Не удалось отобрать ачивку')
      return
    }

    setRevokeTarget(null)
    success('Ачивка отозвана')
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
              onChange: (event) => setLoginDraft(event.target.value),
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
            selectProps={{ value: statusId, onChange: (event) => setStatusIdDraft(event.target.value) }}
          />
          <FormField
            as="select"
            label="Предоплата"
            options={[
              { value: 'optional', label: 'Не требуется' },
              { value: 'required', label: 'Требуется' },
              { value: 'never', label: 'Никогда' },
            ]}
            selectProps={{ value: prepay, onChange: (event) => setPrepayDraft(event.target.value) }}
          />
        </div>

        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Режим «Никогда» отключает автопредоплату для VIP-пользователя: даже
          при поздней отмене записи система не переведёт его в лист предоплаты.
        </p>

        {prepay === 'required' ? (
          <div className="mt-4">
            <FormField
              as="textarea"
              label="Сообщение для бота при предоплате"
              textareaProps={{
                rows: 4,
                value: prepayMessage,
                onChange: (event) => setPrepayMessageDraft(event.target.value),
                placeholder: 'Админ добавил вас в список предоплаты...',
              }}
            />
          </div>
        ) : prepay === 'optional' ? (
          <p className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
            Если убрать пользователя из предоплаты, push в бота придет автоматически.
          </p>
        ) : null}

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
          <h2 className="font-['Space_Grotesk'] text-xl font-bold">Записать на турнир</h2>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <SearchableSelect
                label="Текущие турниры"
                options={[
                  { value: 'none', label: 'Выбери турнир' },
                  ...availableTournaments.map((item) => ({
                    value: String(item.id),
                    label: `${item.name} (${formatDateTime(item.date)})`,
                  })),
                ]}
                value={selectedTournamentId}
                onChange={setSelectedTournamentId}
                placeholder="Поиск по названию турнира..."
              />
            </div>

            <button
              type="button"
              onClick={() => void handleAddTournament()}
              disabled={selectedTournamentId === 'none' || isAddingTournament}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAddingTournament ? 'Записываем...' : 'Записать'}
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="font-['Space_Grotesk'] text-xl font-bold">Ручная корректировка</h2>

          <FormField
            as="select"
            label="Куда начислять очки"
            options={[
              { value: 'none', label: 'Выбери серию' },
              ...state.series.map((item) => ({ value: String(item.id), label: item.name })),
            ]}
            selectProps={{ value: seriesId, onChange: (event) => setSeriesIdDraft(event.target.value) }}
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
            textareaProps={{
              value: reason,
              onChange: (event) => setReason(event.target.value),
              rows: 3,
              placeholder: 'Необязательно',
            }}
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
