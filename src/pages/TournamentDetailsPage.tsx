import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { ResultsImporter } from '../components/ResultsImporter'
import { SearchableSelect } from '../components/SearchableSelect'
import { StatusBadge } from '../components/StatusBadge'
import type {
  TournamentResult,
  TournamentStatus,
} from '../lib/admin-models'
import { formatDateTime, formatDateTimeInput } from '../lib/date'
import { fileToDataUrl } from '../lib/imageUpload'
import { useAdminData } from '../providers/useAdminData'

type EditableResult = {
  place: number
  isItm: boolean
  points: number
  bounty: number
}

const statusOptions: Array<{ value: TournamentStatus; label: string }> = [
  { value: 'upcoming', label: 'Предстоит' },
  { value: 'ongoing', label: 'Идёт' },
  { value: 'completed', label: 'Завершён' },
  { value: 'cancelled', label: 'Отменён' },
]

export function TournamentDetailsPage() {
  const { id } = useParams()
  const tournamentId = Number(id)

  const {
    state,
    activeSeries,
    ratingsBySeriesId,
    getSeriesById,
    getTournamentById,
    getTournamentParticipants,
    updateTournament,
    updateTournamentStatus,
    addRegistration,
    cancelRegistration,
    confirmRegistration,
    moveFromWaitlist,
    saveTournamentResults,
    importTournamentResults,
    updateResult,
    deleteResult,
  } = useAdminData()

  const tournament = getTournamentById(tournamentId)

  const participants = useMemo(
    () => getTournamentParticipants(tournamentId),
    [getTournamentParticipants, tournamentId],
  )

  const [newUserId, setNewUserId] = useState('none')
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [resultsDraft, setResultsDraft] = useState<Record<number, EditableResult>>({})
  const [cancelRegId, setCancelRegId] = useState<number | null>(null)
  const [isSavingTournament, setIsSavingTournament] = useState(false)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [isSavingResults, setIsSavingResults] = useState(false)
  const [isImportingResults, setIsImportingResults] = useState(false)
  const [isCancellingRegistration, setIsCancellingRegistration] = useState(false)
  const [pendingRegistrationId, setPendingRegistrationId] = useState<number | null>(null)
  const [pendingResultId, setPendingResultId] = useState<number | null>(null)

  // Local form state for tournament fields (no per-keystroke mutations)
  const [localName, setLocalName] = useState('')
  const [localFormat, setLocalFormat] = useState('')
  const [localAddress, setLocalAddress] = useState('')
  const [localLocationHint, setLocalLocationHint] = useState('')
  const [localDate, setLocalDate] = useState('')
  const [localSeriesId, setLocalSeriesId] = useState('none')
  const [localMedalId, setLocalMedalId] = useState('none')
  const [localMaxPlayers, setLocalMaxPlayers] = useState(0)
  const [localStatus, setLocalStatus] = useState<TournamentStatus>('upcoming')
  const [localImageUrl, setLocalImageUrl] = useState('')
  const [localImageDataUrl, setLocalImageDataUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [localPrizeInfo, setLocalPrizeInfo] = useState('')
  const [localIsSignificant, setLocalIsSignificant] = useState(false)
  const [localDescription, setLocalDescription] = useState('')
  const [formDirty, setFormDirty] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync local state from server data
  useEffect(() => {
    if (tournament && !formDirty) {
      setLocalName(tournament.name)
      setLocalFormat(tournament.format)
      setLocalAddress(tournament.address)
      setLocalLocationHint(tournament.locationHint)
      setLocalDate(formatDateTimeInput(tournament.date))
      setLocalSeriesId(tournament.seriesId ? String(tournament.seriesId) : 'none')
      setLocalMedalId(tournament.medalId ? String(tournament.medalId) : 'none')
      setLocalMaxPlayers(tournament.maxPlayers)
      setLocalStatus(tournament.status)
      setLocalImageUrl(tournament.imageUrl ?? '')
      setLocalImageDataUrl(null)
      setLocalPrizeInfo(tournament.prizeInfo)
      setLocalIsSignificant(tournament.isSignificant)
      setLocalDescription(tournament.description)
    }
  }, [tournament, formDirty])

  // Auto-dismiss notices
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notice])

  if (!tournament) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--text-muted)]">
        Турнир не найден.
      </div>
    )
  }

  const getResultDraft = (
    userId: number,
    result: TournamentResult | null,
  ): EditableResult => {
    return (
      resultsDraft[userId] ?? {
        place: result?.place ?? 0,
        isItm: result?.isItm ?? false,
        points: result?.points ?? 0,
        bounty: result?.bounty ?? 0,
      }
    )
  }

  const setResultField = (
    userId: number,
    result: TournamentResult | null,
    field: keyof EditableResult,
    value: number | boolean,
  ) => {
    setResultsDraft((previous) => ({
      ...previous,
      [userId]: {
        ...getResultDraft(userId, result),
        [field]: value,
      } as EditableResult,
    }))
  }

  const activeParticipantIds = new Set(
    participants
      .filter((item) => item.registration.status !== 'cancelled')
      .map((item) => item.user.id),
  )

  const availableUsers = state.users.filter((item) => !activeParticipantIds.has(item.id))
  const medalOptions = [
    { value: 'none', label: 'Без медали' },
    ...state.achievements
      .filter((item) => item.iconUrl || item.inactiveIconUrl)
      .map((item) => ({
        value: String(item.id),
        label: item.category ? `${item.name} (${item.category})` : item.name,
      })),
  ]

  const handleSaveTournament = async () => {
    if (isSavingTournament) {
      return
    }

    const newSeriesId = localSeriesId === 'none' ? null : Number(localSeriesId)
    const newMedalId = localMedalId === 'none' ? null : Number(localMedalId)
    const finalImageUrl =
      localImageDataUrl ?? (localImageUrl.trim() ? localImageUrl.trim() : null)

    setIsSavingTournament(true)
    const updated = await updateTournament(tournament.id, {
      name: localName,
      format: localFormat,
      address: localAddress,
      locationHint: localLocationHint,
      date: new Date(localDate).toISOString(),
      seriesId: newSeriesId,
      medalId: newMedalId,
      maxPlayers: localMaxPlayers,
      imageUrl: finalImageUrl,
      isSignificant: localIsSignificant,
      prizeInfo: localPrizeInfo,
      description: localDescription,
    })

    if (!updated) {
      setIsSavingTournament(false)
      setNotice({ text: 'Не удалось сохранить поля турнира', type: 'error' })
      return
    }

    if (localStatus !== tournament.status) {
      const statusUpdated = await updateTournamentStatus(tournament.id, localStatus)

      if (!statusUpdated) {
        setIsSavingTournament(false)
        setNotice({ text: 'Поля сохранены, но статус турнира обновить не удалось', type: 'error' })
        return
      }
    }

    setIsSavingTournament(false)
    setFormDirty(false)
    setNotice({ text: 'Поля турнира сохранены', type: 'success' })
  }

  const handleAddUser = async () => {
    if (isAddingUser) {
      return
    }

    if (newUserId === 'none') {
      return
    }

    setIsAddingUser(true)
    const added = await addRegistration(tournament.id, Number(newUserId))
    setIsAddingUser(false)

    if (!added) {
      setNotice({ text: 'Не удалось добавить пользователя в турнир', type: 'error' })
      return
    }

    setNewUserId('none')
    setNotice({ text: 'Пользователь добавлен в список участников', type: 'success' })
  }

  const handleSaveResults = async () => {
    if (isSavingResults) {
      return
    }

    const rows = participants
      .filter((item) => item.registration.status !== 'cancelled')
      .map((item) => {
        const draft = getResultDraft(item.user.id, item.result)

        return {
          userId: item.user.id,
          place: draft.place,
          isItm: draft.isItm,
          points: draft.points,
          bounty: draft.bounty,
        }
      })
      .filter((item) => item.place > 0)
      .sort((a, b) => a.place - b.place)

    setIsSavingResults(true)
    const saved = await saveTournamentResults(tournament.id, rows)
    setIsSavingResults(false)

    if (!saved) {
      setNotice({ text: 'Не удалось сохранить результаты', type: 'error' })
      return
    }

    setNotice({ text: 'Результаты сохранены', type: 'success' })
  }

  const handleImportResults = async (nicknames: string[]) => {
    if (isImportingResults) {
      return
    }

    setIsImportingResults(true)
    const { unresolved, errorMessage } = await importTournamentResults(tournament.id, nicknames)
    setIsImportingResults(false)

    if (errorMessage) {
      setNotice({ text: errorMessage, type: 'error' })
      return
    }

    if (unresolved.length > 0) {
      setNotice({ text: `Не найдены ники: ${unresolved.join(', ')}`, type: 'error' })
      return
    }

    setResultsDraft({})
    setNotice({ text: 'Результаты импортированы', type: 'success' })
  }

  const handleConfirmRegistration = async (registrationId: number) => {
    if (pendingRegistrationId !== null) {
      return
    }

    setPendingRegistrationId(registrationId)
    const confirmed = await confirmRegistration(registrationId)
    setPendingRegistrationId(null)

    setNotice(
      confirmed
        ? { text: 'Участие подтверждено', type: 'success' }
        : { text: 'Не удалось подтвердить участие', type: 'error' },
    )
  }

  const handleMoveFromWaitlist = async (registrationId: number) => {
    if (pendingRegistrationId !== null) {
      return
    }

    setPendingRegistrationId(registrationId)
    const moved = await moveFromWaitlist(registrationId)
    setPendingRegistrationId(null)

    setNotice(
      moved
        ? { text: 'Игрок переведён из листа ожидания', type: 'success' }
        : { text: 'Не удалось перевести игрока из листа ожидания', type: 'error' },
    )
  }

  const handleUpdateResult = async (
    resultId: number,
    values: Partial<Omit<TournamentResult, 'id' | 'createdAt'>>,
  ) => {
    if (pendingResultId !== null) {
      return
    }

    setPendingResultId(resultId)
    const updated = await updateResult(resultId, values)
    setPendingResultId(null)

    setNotice(
      updated
        ? { text: 'Результат обновлён', type: 'success' }
        : { text: 'Не удалось обновить результат', type: 'error' },
    )
  }

  const handleDeleteResult = async (resultId: number) => {
    if (pendingResultId !== null) {
      return
    }

    setPendingResultId(resultId)
    const deleted = await deleteResult(resultId)
    setPendingResultId(null)

    setNotice(
      deleted
        ? { text: 'Результат удалён', type: 'success' }
        : { text: 'Не удалось удалить результат', type: 'error' },
    )
  }

  const handleCancelRegistration = async () => {
    if (cancelRegId === null || isCancellingRegistration) {
      return
    }

    setIsCancellingRegistration(true)
    const cancelled = await cancelRegistration(cancelRegId)
    setIsCancellingRegistration(false)

    if (!cancelled) {
      setNotice({ text: 'Не удалось отменить регистрацию', type: 'error' })
      return
    }

    setCancelRegId(null)
    setNotice({ text: 'Регистрация отменена', type: 'success' })
  }

  const ratingRows = ratingsBySeriesId[(tournament.seriesId ?? activeSeries?.id) ?? 0] ?? []

  const markDirty = () => { if (!formDirty) setFormDirty(true) }
  const previewImage =
    localImageDataUrl ?? (localImageUrl.trim() ? localImageUrl.trim() : null)

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsImageLoading(true)

    try {
      const dataUrl = await fileToDataUrl(file)
      setLocalImageDataUrl(dataUrl)
      setLocalImageUrl('')
      markDirty()
    } catch {
      setNotice({ text: 'Не удалось обработать изображение', type: 'error' })
    } finally {
      setIsImageLoading(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClearImage = () => {
    setLocalImageDataUrl(null)
    setLocalImageUrl('')
    markDirty()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link to="/tournaments" className="hover:text-[var(--accent)]">Турниры</Link>
        <span>/</span>
        <span className="text-[var(--text-primary)]">#{tournament.id}</span>
      </div>

      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Турнир #{tournament.id}</h1>
          <StatusBadge status={tournament.status} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            label="Название"
            inputProps={{
              value: localName,
              onChange: (event) => { setLocalName(event.target.value); markDirty() },
            }}
          />

          <FormField
            label="Формат"
            inputProps={{
              value: localFormat,
              onChange: (event) => { setLocalFormat(event.target.value); markDirty() },
            }}
          />

          <FormField
            label="Дата"
            inputProps={{
              type: 'datetime-local',
              value: localDate,
              onChange: (event) => { setLocalDate(event.target.value); markDirty() },
            }}
          />

          <FormField
            label="Адрес"
            inputProps={{
              value: localAddress,
              onChange: (event) => { setLocalAddress(event.target.value); markDirty() },
              placeholder: 'Набережная адмиралтейского канала 27',
            }}
          />

          <FormField
            as="select"
            label="Серия"
            options={[
              { value: 'none', label: 'Без серии' },
              ...state.series.map((item) => ({ value: String(item.id), label: item.name })),
            ]}
            selectProps={{
              value: localSeriesId,
              onChange: (event) => { setLocalSeriesId(event.target.value); markDirty() },
            }}
          />

          <FormField
            label="Макс. игроков"
            inputProps={{
              type: 'number',
              min: 1,
              value: localMaxPlayers,
              onChange: (event) => { setLocalMaxPlayers(Number(event.target.value || 1)); markDirty() },
            }}
          />

          <FormField
            label="Подсказка по адресу"
            inputProps={{
              value: localLocationHint,
              onChange: (event) => { setLocalLocationHint(event.target.value); markDirty() },
              placeholder: 'Ориентир, вход со двора, этаж...',
            }}
          />

          <FormField
            as="select"
            label="Медаль победителя"
            options={medalOptions}
            selectProps={{
              value: localMedalId,
              onChange: (event) => { setLocalMedalId(event.target.value); markDirty() },
            }}
          />

          <FormField
            as="select"
            label="Статус"
            options={statusOptions.map((item) => ({ value: item.value, label: item.label }))}
            selectProps={{
              value: localStatus,
              onChange: (event) => { setLocalStatus(event.target.value as TournamentStatus); markDirty() },
            }}
          />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-gray-50/70 px-4 py-3 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={localIsSignificant}
            onChange={(event) => { setLocalIsSignificant(event.target.checked); markDirty() }}
            className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          Значимый турнир для статуса «Легенда»
        </label>

        <FormField
          label="Призы"
          inputProps={{
            value: localPrizeInfo,
            onChange: (event) => { setLocalPrizeInfo(event.target.value); markDirty() },
          }}
        />

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Фото турнира
          </span>
          <FormField
            label="Image URL (опционально)"
            inputProps={{
              value: localImageUrl,
              onChange: (event) => {
                setLocalImageUrl(event.target.value)
                if (localImageDataUrl) {
                  setLocalImageDataUrl(null)
                }
                markDirty()
              },
              placeholder: 'https://...',
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImageLoading}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isImageLoading ? 'Загрузка...' : 'Выбрать файл'}
            </button>
            {(localImageDataUrl || localImageUrl.trim()) && (
              <button
                type="button"
                onClick={handleClearImage}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
              >
                Очистить
              </button>
            )}
          </div>

          {previewImage && (
            <img
              src={previewImage}
              alt="Превью турнира"
              className="h-36 w-full max-w-sm rounded-lg border border-[var(--line)] object-cover"
            />
          )}
        </div>

        <FormField
          as="textarea"
          label="Описание"
          textareaProps={{
            rows: 4,
            value: localDescription,
            onChange: (event) => { setLocalDescription(event.target.value); markDirty() },
          }}
        />

        <button
          type="button"
          onClick={handleSaveTournament}
          disabled={!formDirty || isSavingTournament}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSavingTournament ? 'Сохраняем...' : 'Сохранить изменения'}
        </button>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-['Space_Grotesk'] text-xl font-bold">Участники</h2>

          <div className="flex w-full flex-wrap items-end gap-2 md:w-auto">
            <div className="min-w-56">
              <SearchableSelect
                label="Добавить пользователя"
                options={[
                  { value: 'none', label: 'Выбери пользователя' },
                  ...availableUsers.map((item) => ({
                    value: String(item.id),
                    label: `${item.login} (${item.name})`,
                  })),
                ]}
                value={newUserId}
                onChange={setNewUserId}
                placeholder="Поиск по нику или имени..."
              />
            </div>
            <button
              type="button"
              onClick={() => void handleAddUser()}
              disabled={isAddingUser}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAddingUser ? 'Добавляем...' : 'Добавить'}
            </button>
          </div>
        </div>

        <DataTable
          rows={participants}
          getRowKey={(row) => row.registration.id}
          columns={[
            { header: '№', render: (row) => row.registration.registrationNumber },
            { header: 'Ник', render: (row) => row.user.login },
            { header: 'Имя', render: (row) => row.user.name },
            {
              header: 'Статус',
              render: (row) => <StatusBadge status={row.registration.status} />,
            },
            {
              header: 'Предоплата',
              render: (row) => {
                if (row.registration.confirmedAt) {
                  return (
                    <span className="text-xs text-emerald-700">{formatDateTime(row.registration.confirmedAt)}</span>
                  )
                }

                return (
                  <button
                    type="button"
                    onClick={() => void handleConfirmRegistration(row.registration.id)}
                    disabled={pendingRegistrationId !== null}
                    className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingRegistrationId === row.registration.id ? 'Подтверждаем...' : 'Подтвердить'}
                  </button>
                )
              },
            },
            {
              header: '',
              render: (row) => (
                <div className="flex flex-wrap gap-1">
                  {row.registration.status === 'waitlist' ? (
                    <button
                      type="button"
                      onClick={() => void handleMoveFromWaitlist(row.registration.id)}
                      disabled={pendingRegistrationId !== null}
                      className="rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingRegistrationId === row.registration.id ? 'Переводим...' : 'Из листа ожидания'}
                    </button>
                  ) : null}
                  {row.registration.status !== 'cancelled' ? (
                    <button
                      type="button"
                      onClick={() => setCancelRegId(row.registration.id)}
                      disabled={pendingRegistrationId !== null}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Отменить
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="font-['Space_Grotesk'] text-xl font-bold">Ручной ввод результатов</h2>

        <DataTable
          rows={participants.filter((item) => item.registration.status !== 'cancelled')}
          getRowKey={(row) => row.user.id}
          emptyLabel="Нет активных участников"
          columns={[
            { header: 'Игрок', render: (row) => row.user.login },
            {
              header: 'Место',
              render: (row) => (
                <input
                  type="number"
                  min={0}
                  value={getResultDraft(row.user.id, row.result).place}
                  onChange={(event) =>
                    setResultField(
                      row.user.id,
                      row.result,
                      'place',
                      Number(event.target.value || 0),
                    )
                  }
                  className="w-20 rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
                />
              ),
            },
            {
              header: 'ITM',
              render: (row) => (
                <input
                  type="checkbox"
                  checked={getResultDraft(row.user.id, row.result).isItm}
                  onChange={(event) =>
                    setResultField(
                      row.user.id,
                      row.result,
                      'isItm',
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
              ),
            },
            {
              header: 'Очки',
              render: (row) => (
                <input
                  type="number"
                  value={getResultDraft(row.user.id, row.result).points}
                  onChange={(event) =>
                    setResultField(
                      row.user.id,
                      row.result,
                      'points',
                      Number(event.target.value || 0),
                    )
                  }
                  className="w-24 rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
                />
              ),
            },
            {
              header: 'Баунти',
              render: (row) => (
                <input
                  type="number"
                  value={getResultDraft(row.user.id, row.result).bounty}
                  onChange={(event) =>
                    setResultField(
                      row.user.id,
                      row.result,
                      'bounty',
                      Number(event.target.value || 0),
                    )
                  }
                  className="w-24 rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
                />
              ),
            },
            {
              header: '',
              render: (row) => {
                if (!row.result) {
                  return <span className="text-xs text-[var(--text-muted)]">—</span>
                }

                const currentResult = row.result
                const draft = getResultDraft(row.user.id, row.result)

                return (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        void handleUpdateResult(currentResult.id, {
                          place: draft.place,
                          isItm: draft.isItm,
                          points: draft.points,
                          bounty: draft.bounty,
                        })
                      }
                      disabled={pendingResultId !== null}
                      className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingResultId === currentResult.id ? 'Сохраняем...' : 'Обновить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteResult(currentResult.id)}
                      disabled={pendingResultId !== null}
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingResultId === currentResult.id ? 'Удаляем...' : 'Удалить'}
                    </button>
                  </div>
                )
              },
            },
          ]}
        />

        <button
          type="button"
          onClick={() => void handleSaveResults()}
          disabled={isSavingResults}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingResults ? 'Сохраняем...' : 'Сохранить результаты'}
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ResultsImporter onSave={handleImportResults} pending={isImportingResults} />

        <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Рейтинг серии</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Серия: {getSeriesById(tournament.seriesId)?.name ?? activeSeries?.name ?? 'не выбрана'}
          </p>

          <DataTable
            rows={ratingRows.slice(0, 10)}
            getRowKey={(row) => row.userId}
            emptyLabel="Пока нет данных рейтинга"
            columns={[
              { header: '#', render: (row) => row.rank },
              { header: 'Игрок', render: (row) => row.login },
              { header: 'Очки', render: (row) => row.totalPoints },
              { header: 'Баунти', render: (row) => row.totalBounty },
            ]}
          />
        </div>
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
        open={cancelRegId !== null}
        title="Отменить регистрацию?"
        description="Регистрация участника будет отменена."
        confirmLabel="Отменить регистрацию"
        confirmPendingLabel="Отменяем..."
        pending={isCancellingRegistration}
        onClose={() => setCancelRegId(null)}
        onConfirm={() => void handleCancelRegistration()}
      />
    </div>
  )
}
