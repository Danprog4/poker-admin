import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { SearchableSelect } from '../components/SearchableSelect'
import { StatusBadge } from '../components/StatusBadge'
import { TournamentDescriptionEditor } from '../components/TournamentDescriptionEditor'
import {
  TournamentCardPreview,
  TournamentDetailPreview,
} from '../components/TournamentPreview'
import type {
  TournamentResult,
  TournamentStatus,
} from '../lib/admin-models'
import { formatDateTimeInput } from '../lib/date'
import { fileToDataUrl } from '../lib/imageUpload'
import { replaceLeadingZeroOnFocus } from '../lib/number-input'
import {
  createDescriptionBlock,
  parseTournamentDescription,
  serializeTournamentDescription,
  type TournamentDescriptionBlock,
} from '../lib/tournament-description'
import { useAdminData } from '../providers/useAdminData'
import { useToast } from '../providers/ToastProvider'

type EditableResult = {
  place: number
  isItm: boolean
  points: number
  bounty: number
}

const statusOptions: Array<{ value: TournamentStatus; label: string }> = [
  { value: 'upcoming', label: 'Предстоит' },
  { value: 'ongoing', label: 'Идёт' },
  { value: 'cancelled', label: 'Отменён' },
]

function getDefaultPrepayMessage(_login: string) {
  return 'Из-за отмены записи менее чем за 2 часа до турнира / неявки теперь для вас доступна запись только по предоплате. Напишите менеджеру.'
}

const PARTICIPANT_BADGES = {
  previousWinner: '🔥',
  topRating: '👑',
  regularClub: '🦈',
  newPlayer: '🆕',
} as const

export function TournamentDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tournamentId = Number(id)

  const {
    activeSeries,
    state,
    getTournamentById,
    getTournamentParticipants,
    updateTournament,
    finalizeTournament,
    deleteTournament,
    updateTournamentStatus,
    addRegistration,
    cancelRegistration,
    updateRegistrationBadges,
    moveFromWaitlist,
    setUserPrepay,
    saveTournamentResults,
    updateResult,
    deleteResult,
  } = useAdminData()
  const { success, error } = useToast()

  const tournament = getTournamentById(tournamentId)

  const participants = useMemo(
    () => getTournamentParticipants(tournamentId),
    [getTournamentParticipants, tournamentId],
  )
  const orderedParticipants = useMemo(
    () =>
      participants.map((participant, index) => ({
        ...participant,
        displayOrder: index + 1,
      })),
    [participants],
  )

  const [newUserId, setNewUserId] = useState('none')
  const [resultsDraft, setResultsDraft] = useState<Record<number, EditableResult>>({})
  const [cancelRegId, setCancelRegId] = useState<number | null>(null)
  const [isSavingTournament, setIsSavingTournament] = useState(false)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [isSavingResults, setIsSavingResults] = useState(false)
  const [isCancellingRegistration, setIsCancellingRegistration] = useState(false)
  const [isDeletingTournament, setIsDeletingTournament] = useState(false)
  const [pendingRegistrationId, setPendingRegistrationId] = useState<number | null>(null)
  const [pendingBadgeRegistrationId, setPendingBadgeRegistrationId] = useState<number | null>(null)
  const [pendingResultId, setPendingResultId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false)
  const [isFinalizingTournament, setIsFinalizingTournament] = useState(false)
  const [finalizeSeriesId, setFinalizeSeriesId] = useState('none')

  // Local form state for tournament fields (no per-keystroke mutations)
  const [localName, setLocalName] = useState('')
  const [localDate, setLocalDate] = useState('')
  const [localSeriesId, setLocalSeriesId] = useState('none')
  const [localMedalId, setLocalMedalId] = useState('none')
  const [localMaxPlayersInput, setLocalMaxPlayersInput] = useState('')
  const [localStatus, setLocalStatus] = useState<TournamentStatus>('upcoming')
  const [localImageUrl, setLocalImageUrl] = useState('')
  const [localImageDataUrl, setLocalImageDataUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [localIsSignificant, setLocalIsSignificant] = useState(false)
  const [descriptionBlocks, setDescriptionBlocks] = useState<TournamentDescriptionBlock[]>([])
  const [bonusItems, setBonusItems] = useState<string[]>([''])
  const [formDirty, setFormDirty] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastGeneratedPrizeRef = useRef<string | null>(null)

  // Sync local state from server data
  useEffect(() => {
    if (tournament && !formDirty) {
      setLocalName(tournament.name)
      setLocalDate(formatDateTimeInput(tournament.date))
      setLocalSeriesId(tournament.seriesId ? String(tournament.seriesId) : 'none')
      setLocalMedalId(tournament.medalId ? String(tournament.medalId) : 'none')
      setLocalMaxPlayersInput(String(tournament.maxPlayers))
      setLocalStatus(tournament.status)
      setLocalImageUrl(tournament.imageUrl ?? '')
      setLocalImageDataUrl(null)
      setLocalIsSignificant(tournament.isSignificant)
      setDescriptionBlocks(parseTournamentDescription(tournament.description))
      setBonusItems(tournament.prizeInfo?.trim() ? [tournament.prizeInfo] : [''])
    }
  }, [tournament, formDirty])

  const medalOptions = [
    { value: 'none', label: 'Без медали' },
    ...state.achievements
      .filter((item) => item.iconUrl || item.inactiveIconUrl)
      .map((item) => ({
        value: String(item.id),
        label: item.category ? `${item.name} (${item.category})` : item.name,
      })),
  ]

  const selectedMedalLabel =
    medalOptions.find((item) => item.value === localMedalId)?.label ?? ''
  const statusSelectOptions =
    localStatus === 'completed'
      ? [
          ...statusOptions,
          { value: 'completed' as const, label: 'Завершён' },
        ]
      : statusOptions

  const existingCoverOptions = useMemo(() => {
    const seen = new Set<string>()

    return [...state.tournaments]
      .sort(
        (left, right) =>
          new Date(right.createdAt).valueOf() - new Date(left.createdAt).valueOf(),
      )
      .flatMap((item) => {
        const value = item.imageUrl?.trim()

        if (!value || seen.has(value)) {
          return []
        }

        seen.add(value)

        return [
          {
            imageUrl: value,
            label: item.name,
          },
        ]
      })
  }, [state.tournaments])

  useEffect(() => {
    const nextAutoValue =
      localMedalId === 'none' || !selectedMedalLabel
        ? null
        : `Медаль победителя: ${selectedMedalLabel}`

    setDescriptionBlocks((currentBlocks) => {
      const prizeIndex = currentBlocks.findIndex(
        (block) => block.title.trim() === 'Призы',
      )
      const autoValue = lastGeneratedPrizeRef.current

      if (!nextAutoValue) {
        if (
          prizeIndex >= 0 &&
          autoValue !== null &&
          currentBlocks[prizeIndex]?.items.length === 1 &&
          currentBlocks[prizeIndex]?.items[0]?.trim() === autoValue
        ) {
          lastGeneratedPrizeRef.current = null
          setFormDirty(true)
          return currentBlocks.filter((_, index) => index !== prizeIndex)
        }

        lastGeneratedPrizeRef.current = null
        return currentBlocks
      }

      if (prizeIndex < 0) {
        lastGeneratedPrizeRef.current = nextAutoValue
        setFormDirty(true)
        return [...currentBlocks, createDescriptionBlock('Призы', [nextAutoValue])]
      }

      const prizeBlock = currentBlocks[prizeIndex]
      const shouldAutofill =
        prizeBlock.items.every((item) => !item.trim()) ||
        (autoValue !== null &&
          prizeBlock.items.length === 1 &&
          prizeBlock.items[0]?.trim() === autoValue)

      if (!shouldAutofill) {
        return currentBlocks
      }

      const nextBlocks = [...currentBlocks]
      nextBlocks[prizeIndex] = {
        ...prizeBlock,
        title: 'Призы',
        items: [nextAutoValue],
      }
      lastGeneratedPrizeRef.current = nextAutoValue
      setFormDirty(true)
      return nextBlocks
    })
  }, [localMedalId, selectedMedalLabel])

  if (!tournament) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--text-muted)]">
        Турнир не найден.
      </div>
    )
  }

  const hasEarlierTournamentParticipation = (userId: number) =>
    state.registrations.some((registration) => {
      if (
        registration.userId !== userId ||
        registration.tournamentId === tournament.id ||
        registration.status === 'cancelled'
      ) {
        return false
      }

      const registrationTournament = state.tournaments.find(
        (item) => item.id === registration.tournamentId,
      )

      if (!registrationTournament) {
        return false
      }

      return (
        new Date(registrationTournament.date).valueOf() <
        new Date(tournament.date).valueOf()
      )
    })

  const getParticipantBadge = (participant: (typeof participants)[number]) => {
    if (participant.registration.hasPreviousWinnerBadge) {
      return PARTICIPANT_BADGES.previousWinner
    }

    if (participant.registration.hasTopRatingBadge) {
      return PARTICIPANT_BADGES.topRating
    }

    return hasEarlierTournamentParticipation(participant.user.id)
      ? PARTICIPANT_BADGES.regularClub
      : PARTICIPANT_BADGES.newPlayer
  }

  const buildParticipantsClipboardText = () => {
    const rows = participants
      .filter((participant) => participant.registration.status !== 'cancelled')
      .sort(
        (left, right) =>
          left.registration.registrationNumber - right.registration.registrationNumber,
      )

    if (rows.length === 0) {
      return null
    }

    const legend = [
      `${PARTICIPANT_BADGES.previousWinner} — победитель прошлого турнира`,
      `${PARTICIPANT_BADGES.topRating} — топ рейтинга`,
      `${PARTICIPANT_BADGES.regularClub} — регуляр клуба`,
      `${PARTICIPANT_BADGES.newPlayer} — новый игрок`,
    ].join('\n')

    const list = rows
      .map((participant, index) => {
        const label =
          participant.user.login?.trim() ||
          participant.user.name?.trim() ||
          `Игрок ${participant.user.id}`
        const badge = getParticipantBadge(participant)

        return `${index + 1}. ${label}${badge ? ` ${badge}` : ''}`
      })
      .join('\n')

    return `${legend}\n\nСписок игроков\n\n${list}`
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

  const hasAnyResultData = (
    userId: number,
    result: TournamentResult | null,
  ) => {
    const draft = getResultDraft(userId, result)

    return (
      draft.place > 0 ||
      draft.points > 0 ||
      draft.bounty > 0 ||
      draft.isItm ||
      result !== null
    )
  }

  const activeParticipantIds = new Set(
    participants
      .filter((item) => item.registration.status !== 'cancelled')
      .map((item) => item.user.id),
  )

  const availableUsers = state.users.filter((item) => !activeParticipantIds.has(item.id))

  const handleSaveTournament = async () => {
    if (isSavingTournament) {
      return
    }

    const parsedMaxPlayers = Number.parseInt(localMaxPlayersInput, 10)

    if (!Number.isFinite(parsedMaxPlayers) || parsedMaxPlayers < 1) {
      error('Укажи корректное число участников')
      return
    }

    const newSeriesId = localSeriesId === 'none' ? null : Number(localSeriesId)
    const newMedalId = localMedalId === 'none' ? null : Number(localMedalId)
    const finalImageUrl =
      localImageDataUrl ?? (localImageUrl.trim() ? localImageUrl.trim() : null)
    const description = serializeTournamentDescription(descriptionBlocks)
    const firstBonusLine = bonusItems.map((item) => item.trim()).find(Boolean) ?? ''

    setIsSavingTournament(true)
    const updated = await updateTournament(tournament.id, {
      name: localName,
      date: localDate,
      seriesId: newSeriesId,
      medalId: newMedalId,
      maxPlayers: parsedMaxPlayers,
      imageUrl: finalImageUrl,
      isSignificant: localIsSignificant,
      prizeInfo: firstBonusLine,
      description,
    })

    if (!updated) {
      setIsSavingTournament(false)
      error('Не удалось сохранить поля турнира')
      return
    }

    if (localStatus !== tournament.status) {
      const statusUpdated = await updateTournamentStatus(tournament.id, localStatus)

      if (!statusUpdated) {
        setIsSavingTournament(false)
        error('Поля сохранены, но статус турнира обновить не удалось')
        return
      }
    }

    setIsSavingTournament(false)
    setFormDirty(false)
    success('Изменения применены')
  }

  const handleAddUser = async (userIdValue?: string) => {
    if (isAddingUser) {
      return
    }

    const nextUserId = userIdValue ?? newUserId

    if (nextUserId === 'none') {
      return
    }

    setIsAddingUser(true)
    const added = await addRegistration(tournament.id, Number(nextUserId))
    setIsAddingUser(false)

    if (!added) {
      error('Не удалось добавить пользователя в турнир')
      return
    }

    setNewUserId('none')
    success('Пользователь добавлен в список участников')
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

    if (rows.length === 0) {
      error('Заполни хотя бы одно место, чтобы сохранить результаты')
      return
    }

    const usedPlaces = new Set<number>()

    for (const row of rows) {
      if (usedPlaces.has(row.place)) {
        error('У результатов не должно быть одинаковых мест')
        return
      }

      usedPlaces.add(row.place)
    }

    setIsSavingResults(true)
    const saved = await saveTournamentResults(tournament.id, rows)
    setIsSavingResults(false)

    if (!saved) {
      error('Не удалось сохранить результаты')
      return
    }

    success('Изменения применены')
  }

  const handleOpenFinalizeDialog = () => {
    if (formDirty) {
      error('Сначала сохрани изменения карточки турнира, потом заверши турнир')
      return
    }

    if (state.series.length === 0) {
      error('Сначала создай серию, чтобы начислить в неё очки')
      return
    }

    const nextSeriesId =
      localSeriesId !== 'none'
        ? localSeriesId
        : tournament.seriesId
          ? String(tournament.seriesId)
          : activeSeries
            ? String(activeSeries.id)
            : 'none'

    setFinalizeSeriesId(nextSeriesId)
    setIsFinalizeDialogOpen(true)
  }

  const handleFinalizeTournament = async () => {
    if (isFinalizingTournament) {
      return
    }

    if (finalizeSeriesId === 'none') {
      error('Выбери серию, в которую должны попасть очки')
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

    if (rows.length === 0) {
      error('Заполни результаты перед завершением турнира')
      return
    }

    const usedPlaces = new Set<number>()

    for (const row of rows) {
      if (usedPlaces.has(row.place)) {
        error('У результатов не должно быть одинаковых мест')
        return
      }

      usedPlaces.add(row.place)
    }

    setIsFinalizingTournament(true)
    const finalized = await finalizeTournament(tournament.id, {
      seriesId: Number(finalizeSeriesId),
      results: rows,
    })
    setIsFinalizingTournament(false)

    if (!finalized) {
      error('Не удалось завершить турнир')
      return
    }

    setLocalSeriesId(finalizeSeriesId)
    setLocalStatus('completed')
    setResultsDraft({})
    setIsFinalizeDialogOpen(false)
    success('Турнир завершён, результаты и очки сохранены')
  }

  const handleMoveFromWaitlist = async (registrationId: number) => {
    if (pendingRegistrationId !== null) {
      return
    }

    setPendingRegistrationId(registrationId)
    const moved = await moveFromWaitlist(registrationId)
    setPendingRegistrationId(null)

    if (moved) {
      success('Изменения применены')
      return
    }

    error('Не удалось перевести игрока из листа ожидания')
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

    if (updated) {
      success('Изменения применены')
      return
    }

    error('Не удалось обновить результат')
  }

  const handleDeleteResult = async (resultId: number) => {
    if (pendingResultId !== null) {
      return
    }

    setPendingResultId(resultId)
    const deleted = await deleteResult(resultId)
    setPendingResultId(null)

    if (deleted) {
      success('Изменения применены')
      return
    }

    error('Не удалось удалить результат')
  }

  const handleCancelRegistration = async () => {
    if (cancelRegId === null || isCancellingRegistration) {
      return
    }

    setIsCancellingRegistration(true)
    const cancelled = await cancelRegistration(cancelRegId)
    setIsCancellingRegistration(false)

    if (!cancelled) {
      error('Не удалось отменить регистрацию')
      return
    }

    setCancelRegId(null)
    success('Изменения применены')
  }

  const markDirty = () => { if (!formDirty) setFormDirty(true) }
  const previewImage =
    localImageDataUrl ?? (localImageUrl.trim() ? localImageUrl.trim() : null)
  const previewDateLabel = localDate
    ? new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(localDate))
    : new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date())

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
      error('Не удалось обработать изображение')
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

  const handleSelectUser = (value: string) => {
    setNewUserId(value)

    if (value !== 'none') {
      void handleAddUser(value)
    }
  }

  const handleClearPrepay = async (userId: number) => {
    if (pendingRegistrationId !== null) {
      return
    }

    setPendingRegistrationId(userId)
    const cleared = await setUserPrepay(userId, 'optional')
    setPendingRegistrationId(null)

    if (cleared) {
      success('Изменения применены')
      return
    }

    error('Не удалось убрать пользователя из листа предоплаты')
  }

  const handleSetPrepay = async (userId: number, login: string) => {
    if (pendingRegistrationId !== null) {
      return
    }

    setPendingRegistrationId(userId)
    const applied = await setUserPrepay(
      userId,
      'required',
      getDefaultPrepayMessage(login || `Игрок ${userId}`),
    )
    setPendingRegistrationId(null)

    if (applied) {
      success('Изменения применены')
      return
    }

    error('Не удалось добавить пользователя в лист предоплаты')
  }

  const handleMaxPlayersChange = (value: string) => {
    setLocalMaxPlayersInput(value.replace(/\D+/g, ''))
    markDirty()
  }

  const handleDeleteTournament = async () => {
    if (isDeletingTournament) {
      return
    }

    setIsDeletingTournament(true)
    const deleted = await deleteTournament(tournament.id)
    setIsDeletingTournament(false)

    if (!deleted) {
      error('Не удалось удалить турнир')
      return
    }

    success('Турнир удалён')
    navigate('/tournaments')
  }

  const handleToggleRegistrationBadge = async (
    registrationId: number,
    patch: {
      hasTopRatingBadge?: boolean
      hasPreviousWinnerBadge?: boolean
    },
  ) => {
    if (pendingBadgeRegistrationId !== null) {
      return
    }

    setPendingBadgeRegistrationId(registrationId)
    const updated = await updateRegistrationBadges(registrationId, patch)
    setPendingBadgeRegistrationId(null)

    if (!updated) {
      error('Не удалось обновить эмодзи участника')
      return
    }

    success('Изменения применены')
  }

  const handleCopyResults = async () => {
    const text = buildParticipantsClipboardText()

    if (!text) {
      error('Пока нет участников для копирования')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      success('Список игроков скопирован')
    } catch (cause) {
      console.error(cause)
      error('Не удалось скопировать список игроков')
    }
  }

  const isBeforeTournamentStart =
    tournament.status === 'upcoming' &&
    new Date(tournament.date).valueOf() > Date.now()
  const isTournamentCompleted =
    tournament.status === 'completed' || localStatus === 'completed'

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
          <div className="flex items-center gap-2">
            <StatusBadge status={tournament.status} />
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Удалить
            </button>
          </div>
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
            label="Дата"
            inputProps={{
              type: 'datetime-local',
              value: localDate,
              onChange: (event) => { setLocalDate(event.target.value); markDirty() },
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
              type: 'text',
              inputMode: 'numeric',
              pattern: '[0-9]*',
              value: localMaxPlayersInput,
              onChange: (event) => { handleMaxPlayersChange(event.target.value) },
              placeholder: '100',
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
            options={statusSelectOptions.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            selectProps={{
              value: localStatus,
              disabled: localStatus === 'completed',
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
          label="URL картинки (необязательно)"
          inputProps={{
            value: localImageUrl,
            onChange: (event) => {
              setLocalImageUrl(event.target.value)
              if (localImageDataUrl) {
                setLocalImageDataUrl(null)
              }
              markDirty()
            },
            placeholder: 'https://... или /images/...',
          }}
        />

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Фото турнира
          </span>
          <p className="text-sm text-[var(--text-muted)]">
            Картинка грузится как квадрат 1:1. Ниже показываем два реальных
            превью из приложения. Поле можно оставить пустым, тогда в приложении
            будет стандартный placeholder.
          </p>

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
            <button
              type="button"
              onClick={handleClearImage}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
            >
              Использовать placeholder
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

          {!previewImage ? (
            <p className="text-sm text-[var(--text-muted)]">
              Сейчас выбрана стандартная обложка по умолчанию.
            </p>
          ) : null}

          {existingCoverOptions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-muted)]">
                Или выбрать из уже загруженных обложек:
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {existingCoverOptions.map((cover) => {
                  const isSelected = previewImage === cover.imageUrl

                  return (
                    <button
                      key={cover.imageUrl}
                      type="button"
                      onClick={() => {
                        setLocalImageUrl(cover.imageUrl)
                        setLocalImageDataUrl(null)
                        markDirty()
                      }}
                      className={`overflow-hidden rounded-lg border text-left transition ${
                        isSelected
                          ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]'
                          : 'border-[var(--line)] hover:border-[var(--accent)]'
                      }`}
                    >
                      <img
                        src={cover.imageUrl}
                        alt={cover.label}
                        className="h-28 w-full object-cover"
                      />
                      <div className="border-t border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text-primary)]">
                        <span className="line-clamp-2">{cover.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <TournamentDescriptionEditor
          blocks={descriptionBlocks}
          onChange={(nextBlocks) => {
            setDescriptionBlocks(nextBlocks)
            markDirty()
          }}
        />

        <section className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--bg-surface-muted)] p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Бонусы
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Этот текст показывается в карточке турнира и в hero-блоке
              экрана турнира. Призы от медали добавляются в описание выше.
            </p>
          </div>

          {bonusItems.map((item, index) => (
            <div key={`bonus-${index}`} className="flex gap-2">
              <input
                value={item}
                onChange={(event) => {
                  const next = [...bonusItems]
                  next[index] = event.target.value
                  setBonusItems(next)
                  markDirty()
                }}
                placeholder="Например: Топ 10 получают бонус"
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
              <button
                type="button"
                onClick={() => {
                  setBonusItems((current) =>
                    current.length > 1
                      ? current.filter((_, itemIndex) => itemIndex !== index)
                      : [''],
                  )
                  markDirty()
                }}
                className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-gray-50"
              >
                −
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              setBonusItems((current) => [...current, ''])
              markDirty()
            }}
            className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-gray-50"
          >
            Добавить пункт
          </button>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
        <TournamentCardPreview
          name={localName}
          dateLabel={previewDateLabel}
          seatsLabel={`0/${localMaxPlayersInput || 0}`}
          imageUrl={previewImage}
        />
        <TournamentDetailPreview
          name={localName}
          dateLabel={previewDateLabel}
          seatsLabel={`${localMaxPlayersInput || 0} мест`}
          bonusLabel={bonusItems.map((item) => item.trim()).find(Boolean) ?? ''}
          imageUrl={previewImage}
          sections={descriptionBlocks}
          />
        </div>

        <button
          type="button"
          onClick={handleSaveTournament}
          disabled={!formDirty || isSavingTournament || isTournamentCompleted}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSavingTournament ? 'Сохраняем...' : 'Сохранить изменения'}
        </button>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-['Space_Grotesk'] text-xl font-bold">Участники</h2>

          <div className="flex w-full flex-wrap items-end gap-2 md:w-auto">
            {isBeforeTournamentStart ? (
              <button
                type="button"
                onClick={() => void handleCopyResults()}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
              >
                Скопировать участников
              </button>
            ) : null}
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
                onChange={handleSelectUser}
                placeholder="Поиск по нику или имени..."
                disabled={isAddingUser}
                disabledLabel="Добавляем пользователя..."
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span>{PARTICIPANT_BADGES.previousWinner} победитель прошлого турнира</span>
            <span>{PARTICIPANT_BADGES.topRating} топ рейтинга</span>
            <span>{PARTICIPANT_BADGES.regularClub} регуляр клуба</span>
            <span>{PARTICIPANT_BADGES.newPlayer} новый игрок</span>
          </div>
        </div>

        <DataTable
          rows={orderedParticipants}
          getRowKey={(row) => row.registration.id}
          columns={[
            { header: '№', render: (row) => row.displayOrder },
            { header: 'Ник', render: (row) => row.user.login },
            { header: 'Имя', render: (row) => row.user.name },
            {
              header: 'Регистрация',
              render: (row) => <StatusBadge status={row.registration.status} />,
            },
            {
              header: 'Эмодзи',
              render: (row) => {
                const badge = getParticipantBadge(row)

                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-lg">
                      <span>{badge}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleRegistrationBadge(row.registration.id, {
                            hasPreviousWinnerBadge:
                              !row.registration.hasPreviousWinnerBadge,
                            hasTopRatingBadge: false,
                          })
                        }
                        disabled={pendingBadgeRegistrationId !== null}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          row.registration.hasPreviousWinnerBadge
                            ? 'border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                            : 'border border-[var(--line)] bg-white text-[var(--text-secondary)] hover:bg-gray-50'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        🔥 Победитель
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleRegistrationBadge(row.registration.id, {
                            hasTopRatingBadge: !row.registration.hasTopRatingBadge,
                            hasPreviousWinnerBadge: false,
                          })
                        }
                        disabled={pendingBadgeRegistrationId !== null}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          row.registration.hasTopRatingBadge
                            ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'border border-[var(--line)] bg-white text-[var(--text-secondary)] hover:bg-gray-50'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        👑 Топ рейтинга
                      </button>
                    </div>
                  </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-['Space_Grotesk'] text-xl font-bold">Результаты и завершение</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Очки уйдут в серию, выбранную у турнира при завершении. Если нужна
              другая серия, её можно выбрать в окне завершения.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyResults()}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
            >
              Скопировать список игроков
            </button>
            <button
              type="button"
              onClick={handleOpenFinalizeDialog}
              disabled={isFinalizingTournament || isTournamentCompleted}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFinalizingTournament ? 'Завершаем...' : 'Завершить турнир'}
            </button>
          </div>
        </div>

        <DataTable
          rows={participants}
          getRowKey={(row) => row.user.id}
          emptyLabel="Нет участников"
          columns={[
            { header: 'Игрок', render: (row) => row.user.login },
            {
              header: 'Регистрация',
              render: (row) => <StatusBadge status={row.registration.status} />,
            },
            {
              header: 'Место',
              render: (row) => {
                const isRowDisabled = row.user.isPrepayRequired || isTournamentCompleted

                return (
                  <input
                    type="number"
                    min={0}
                    value={getResultDraft(row.user.id, row.result).place}
                    onFocus={replaceLeadingZeroOnFocus}
                    onChange={(event) =>
                      setResultField(
                        row.user.id,
                        row.result,
                        'place',
                        Number(event.target.value || 0),
                      )
                    }
                    disabled={isRowDisabled}
                    className="w-20 rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-[var(--text-muted)]"
                  />
                )
              },
            },
            {
              header: 'ITM',
              render: (row) => {
                const isRowDisabled = row.user.isPrepayRequired || isTournamentCompleted

                return (
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
                    disabled={isRowDisabled}
                    className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                )
              },
            },
            {
              header: 'Очки',
              render: (row) => {
                const isRowDisabled = row.user.isPrepayRequired || isTournamentCompleted

                return (
                  <input
                    type="number"
                    value={getResultDraft(row.user.id, row.result).points}
                    onFocus={replaceLeadingZeroOnFocus}
                    onChange={(event) =>
                      setResultField(
                        row.user.id,
                        row.result,
                        'points',
                        Number(event.target.value || 0),
                      )
                    }
                    disabled={isRowDisabled}
                    className="w-24 rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-[var(--text-muted)]"
                  />
                )
              },
            },
            {
              header: 'Баунти',
              render: (row) => {
                const isRowDisabled = row.user.isPrepayRequired || isTournamentCompleted

                return (
                  <input
                    type="number"
                    value={getResultDraft(row.user.id, row.result).bounty}
                    onFocus={replaceLeadingZeroOnFocus}
                    onChange={(event) =>
                      setResultField(
                        row.user.id,
                        row.result,
                        'bounty',
                        Number(event.target.value || 0),
                      )
                    }
                    disabled={isRowDisabled}
                    className="w-24 rounded-lg border border-[var(--line)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-[var(--text-muted)]"
                  />
                )
              },
            },
            {
              header: '',
              render: (row) => {
                const currentResult = row.result
                const draft = getResultDraft(row.user.id, row.result)
                const shouldHidePrepay = hasAnyResultData(row.user.id, row.result)

                return (
                  <div className="flex min-h-8 min-w-[18rem] flex-wrap items-center gap-1">
                    {shouldHidePrepay ? null : row.user.isPrepayRequired ? (
                      <button
                        type="button"
                        onClick={() => void handleClearPrepay(row.user.id)}
                        disabled={pendingRegistrationId !== null}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pendingRegistrationId === row.user.id ? 'Убираем...' : 'Убрать из предоплаты'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSetPrepay(row.user.id, row.user.login)}
                        disabled={pendingRegistrationId !== null}
                        className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pendingRegistrationId === row.user.id ? 'Добавляем...' : 'В предоплату'}
                      </button>
                    )}
                    {currentResult ? (
                      <>
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
                      </>
                    ) : null}
                    {!currentResult && shouldHidePrepay ? (
                      <span className="inline-flex min-h-8 items-center rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                        Участник отмечен по результатам
                      </span>
                    ) : null}
                  </div>
                )
              },
            },
          ]}
        />

        <button
          type="button"
          onClick={() => void handleSaveResults()}
          disabled={isSavingResults || isTournamentCompleted}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingResults ? 'Сохраняем...' : 'Сохранить результаты'}
        </button>
      </section>

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

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Удалить турнир?"
        description="Это действие нельзя отменить. Система автоматически очистит регистрации, результаты и зависимые привязки, после чего удалит турнир."
        confirmLabel="Удалить"
        confirmPendingLabel="Удаляем..."
        pending={isDeletingTournament}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => void handleDeleteTournament()}
      />

      {isFinalizeDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-gray-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-[var(--line)] bg-white p-6 shadow-2xl">
            <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[var(--text-primary)]">
              Завершить турнир
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Система сохранит текущие результаты, привяжет турнир к выбранной
              серии и переведёт его в статус «Завершён».
            </p>

            <div className="mt-4">
              <FormField
                as="select"
                label="Серия для начисления очков"
                options={[
                  { value: 'none', label: 'Выбери серию' },
                  ...state.series.map((item) => ({
                    value: String(item.id),
                    label: item.isActive ? `${item.name} (активная)` : item.name,
                  })),
                ]}
                selectProps={{
                  value: finalizeSeriesId,
                  onChange: (event) => setFinalizeSeriesId(event.target.value),
                }}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFinalizeDialogOpen(false)}
                disabled={isFinalizingTournament}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleFinalizeTournament()}
                disabled={isFinalizingTournament}
                className="rounded-lg bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFinalizingTournament ? 'Завершаем...' : 'Завершить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
