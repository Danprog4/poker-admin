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
import {
  formatDateTimeInput,
  formatDateTimeInputLabel,
  formatDateLabel,
  formatTimeLabel,
} from '../lib/date'
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
    moveFromWaitlist,
    setUserPrepay,
    createManualUser,
    saveTournamentResults,
    deleteResult,
  } = useAdminData()
  const { success, error } = useToast()

  const tournament = getTournamentById(tournamentId)
  const [participantQuery, setParticipantQuery] = useState('')

  const participants = useMemo(
    () => getTournamentParticipants(tournamentId),
    [getTournamentParticipants, tournamentId],
  )

  const [newUserId, setNewUserId] = useState('none')
  const [isManualUserDialogOpen, setIsManualUserDialogOpen] = useState(false)
  const [manualUserLogin, setManualUserLogin] = useState('')
  const [manualUserName, setManualUserName] = useState('')
  const [manualTelegramUsername, setManualTelegramUsername] = useState('')
  const [resultEntryUserId, setResultEntryUserId] = useState('none')
  const [resultEntryDraft, setResultEntryDraft] = useState<EditableResult>({
    place: 0,
    isItm: false,
    points: 0,
    bounty: 0,
  })
  const [resultsDraft, setResultsDraft] = useState<Record<number, EditableResult>>({})
  const [cancelRegId, setCancelRegId] = useState<number | null>(null)
  const [isSavingTournament, setIsSavingTournament] = useState(false)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [isCreatingManualUser, setIsCreatingManualUser] = useState(false)
  const [isSavingResults, setIsSavingResults] = useState(false)
  const [isCancellingRegistration, setIsCancellingRegistration] = useState(false)
  const [isDeletingTournament, setIsDeletingTournament] = useState(false)
  const [pendingRegistrationId, setPendingRegistrationId] = useState<number | null>(null)
  const [pendingResultId, setPendingResultId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false)
  const [isMissingResultsDialogOpen, setIsMissingResultsDialogOpen] = useState(false)
  const [isFinalizingTournament, setIsFinalizingTournament] = useState(false)
  const [isEditingCompletedResults, setIsEditingCompletedResults] = useState(false)
  const [finalizeSeriesId, setFinalizeSeriesId] = useState('none')
  const [missingResultsLogins, setMissingResultsLogins] = useState<string[]>([])
  const [hasHydratedResultsDraft, setHasHydratedResultsDraft] = useState(false)
  const resultsDraftStorageKey =
    tournamentId > 0 ? `tournament-results-draft:${tournamentId}` : null

  // Local form state for tournament fields (no per-keystroke mutations)
  const [localName, setLocalName] = useState('')
  const [localDate, setLocalDate] = useState('')
  const [localLateRegistrationEndsAt, setLocalLateRegistrationEndsAt] = useState('')
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
      setLocalLateRegistrationEndsAt(
        tournament.lateRegistrationEndsAt
          ? formatDateTimeInput(tournament.lateRegistrationEndsAt)
          : '',
      )
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

  useEffect(() => {
    if (!resultsDraftStorageKey || typeof window === 'undefined') {
      return
    }

    setHasHydratedResultsDraft(false)

    try {
      const raw = window.localStorage.getItem(resultsDraftStorageKey)

      if (!raw) {
        setResultsDraft({})
      } else {
        const parsed = JSON.parse(raw) as Record<string, Partial<EditableResult>>
        const nextDraft: Record<number, EditableResult> = {}

        for (const [key, value] of Object.entries(parsed)) {
          const userId = Number(key)

          if (!Number.isInteger(userId) || !value) {
            continue
          }

          nextDraft[userId] = {
            place: Math.max(0, Number(value.place ?? 0)),
            isItm: Boolean(value.isItm),
            points: Math.max(0, Number(value.points ?? 0)),
            bounty: Math.max(0, Number(value.bounty ?? 0)),
          }
        }

        setResultsDraft(nextDraft)
      }
    } catch {
      setResultsDraft({})
    } finally {
      setHasHydratedResultsDraft(true)
    }
  }, [resultsDraftStorageKey])

  useEffect(() => {
    if (
      !resultsDraftStorageKey ||
      typeof window === 'undefined' ||
      !hasHydratedResultsDraft
    ) {
      return
    }

    if (Object.keys(resultsDraft).length === 0) {
      window.localStorage.removeItem(resultsDraftStorageKey)
      return
    }

    window.localStorage.setItem(resultsDraftStorageKey, JSON.stringify(resultsDraft))
  }, [hasHydratedResultsDraft, resultsDraft, resultsDraftStorageKey])

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

  const clearStoredResultsDraft = () => {
    if (!resultsDraftStorageKey || typeof window === 'undefined') {
      return
    }

    window.localStorage.removeItem(resultsDraftStorageKey)
  }

  const getParticipantDisplayName = (user: {
    id: number
    login?: string | null
    name?: string | null
  }) =>
    user.login?.trim() || user.name?.trim() || `Игрок ${user.id}`

  const getParticipantSelectLabel = (user: {
    id: number
    login?: string | null
    telegramUsername?: string | null
    name?: string | null
  }) => {
    const baseLabel = getParticipantDisplayName(user)
    const extraParts = [
      user.login?.trim() && user.login.trim() !== baseLabel ? user.login.trim() : null,
      user.telegramUsername?.trim() ? `@${user.telegramUsername.trim()}` : null,
      user.name?.trim() && user.name.trim() !== baseLabel ? user.name.trim() : null,
    ].filter(Boolean)

    return extraParts.length > 0
      ? `${baseLabel} (${extraParts.join(' • ')})`
      : baseLabel
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

    const list = rows
      .map(
        (participant, index) =>
          `${index + 1}. ${getParticipantDisplayName(participant.user)}`,
      )
      .join('\n')

    return `Список игроков\n\n${list}`
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

  const setResultEntryField = (
    field: keyof EditableResult,
    value: number | boolean,
  ) => {
    setResultEntryDraft((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const hasAnyResultData = (
    userId: number,
    result: TournamentResult | null,
  ) => {
    const draft = getResultDraft(userId, result)

    return (
      userId in resultsDraft ||
      draft.points > 0 ||
      draft.bounty > 0 ||
      draft.isItm ||
      result !== null
    )
  }

  const orderedParticipants = useMemo(() => {
    const normalized = participantQuery.trim().toLowerCase()

    return participants
      .filter((participant) => {
        if (!normalized) {
          return true
        }

        return (
          (participant.user.login ?? '').toLowerCase().includes(normalized) ||
          (participant.user.telegramUsername ?? '')
            .toLowerCase()
            .includes(normalized) ||
          (participant.user.name ?? '').toLowerCase().includes(normalized) ||
          String(participant.user.id).includes(normalized)
        )
      })
      .sort((left, right) => {
        const leftPlace =
          getResultDraft(left.user.id, left.result).place || Number.POSITIVE_INFINITY
        const rightPlace =
          getResultDraft(right.user.id, right.result).place || Number.POSITIVE_INFINITY

        if (leftPlace !== rightPlace) {
          return leftPlace - rightPlace
        }

        return (
          left.registration.registrationNumber - right.registration.registrationNumber
        )
      })
      .map((participant, index) => ({
        ...participant,
        displayOrder: index + 1,
      }))
  }, [participantQuery, participants, resultsDraft])

  const activeParticipantIds = new Set(
    participants
      .filter((item) => item.registration.status !== 'cancelled')
      .map((item) => item.user.id),
  )

  const enteredResultsParticipants = useMemo(
    () =>
      participants
        .filter((item) => item.registration.status !== 'cancelled')
        .filter((item) => hasAnyResultData(item.user.id, item.result))
        .sort((left, right) => {
          const leftPlace =
            getResultDraft(left.user.id, left.result).place || Number.POSITIVE_INFINITY
          const rightPlace =
            getResultDraft(right.user.id, right.result).place || Number.POSITIVE_INFINITY

          if (leftPlace !== rightPlace) {
            return leftPlace - rightPlace
          }

          return (
            left.registration.registrationNumber - right.registration.registrationNumber
          )
        }),
    [participants, resultsDraft],
  )

  const availableResultParticipants = useMemo(
    () =>
      participants
        .filter((item) => item.registration.status !== 'cancelled')
        .filter((item) => !hasAnyResultData(item.user.id, item.result))
        .sort(
          (left, right) =>
            left.registration.registrationNumber - right.registration.registrationNumber,
        ),
    [participants, resultsDraft],
  )

  const resultParticipantOptions = useMemo(
    () =>
      availableResultParticipants.map((participant) => ({
        value: String(participant.user.id),
        label: getParticipantSelectLabel(participant.user),
      })),
    [availableResultParticipants],
  )

  const missingResultPlaces = useMemo(() => {
    const places = enteredResultsParticipants
      .map((participant) => getResultDraft(participant.user.id, participant.result).place)
      .filter((place) => place > 0)
      .sort((a, b) => a - b)

    if (places.length === 0) {
      return []
    }

    const usedPlaces = new Set(places)
    const maxPlace = places[places.length - 1] ?? 0

    return Array.from({ length: maxPlace }, (_, index) => index + 1).filter(
      (place) => !usedPlaces.has(place),
    )
  }, [enteredResultsParticipants, resultsDraft])

  const duplicateResultPlaces = useMemo(() => {
    const counts = new Map<number, number>()

    for (const participant of enteredResultsParticipants) {
      const place = getResultDraft(participant.user.id, participant.result).place

      if (place <= 0) {
        continue
      }

      counts.set(place, (counts.get(place) ?? 0) + 1)
    }

    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([place]) => place)
      .sort((a, b) => a - b)
  }, [enteredResultsParticipants, resultsDraft])

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
      lateRegistrationEndsAt: localLateRegistrationEndsAt || null,
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

  const handleCreateManualUser = async () => {
    const login = manualUserLogin.trim()
    const name = manualUserName.trim()
    const telegramUsername = manualTelegramUsername.trim().replace(/^@+/, '')

    if (!login && !name) {
      error('Укажи имя или ник участника')
      return
    }

    setIsCreatingManualUser(true)
    const createdUser = await createManualUser({
      login: login || undefined,
      name: name || undefined,
      telegramUsername: telegramUsername || undefined,
    })

    if (!createdUser) {
      setIsCreatingManualUser(false)
      error('Не удалось создать ручного участника')
      return
    }

    const added = await addRegistration(tournament.id, createdUser.id)
    setIsCreatingManualUser(false)

    if (!added) {
      error('Пользователь создан, но в турнир добавить его не удалось')
      return
    }

    setIsManualUserDialogOpen(false)
    setManualUserLogin('')
    setManualUserName('')
    setManualTelegramUsername('')
    success('Ручной участник создан и добавлен в турнир')
  }

  const handleAddResultEntry = () => {
    if (resultEntryUserId === 'none') {
      error('Выбери участника турнира')
      return
    }

    if (resultEntryDraft.place < 1) {
      error('Укажи место участника')
      return
    }

    if (resultEntryDraft.points <= 0 && resultEntryDraft.bounty <= 0) {
      error('Укажи очки или баунти участника')
      return
    }

    const nextUserId = Number(resultEntryUserId)
    const hasDuplicatePlace = enteredResultsParticipants.some((participant) => {
      if (participant.user.id === nextUserId) {
        return false
      }

      return getResultDraft(participant.user.id, participant.result).place === resultEntryDraft.place
    })

    if (hasDuplicatePlace) {
      error('Такое место уже занято другим участником')
      return
    }

    setResultsDraft((previous) => ({
      ...previous,
      [nextUserId]: {
        place: resultEntryDraft.place,
        isItm: resultEntryDraft.isItm,
        points: resultEntryDraft.points,
        bounty: resultEntryDraft.bounty,
      },
    }))

    setResultEntryUserId('none')
    setResultEntryDraft({
      place: 0,
      isItm: false,
      points: 0,
      bounty: 0,
    })
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
      error('Заполни хотя бы очки, баунти, ITM или место, чтобы сохранить результаты')
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

    clearStoredResultsDraft()
    setResultsDraft({})
    setIsEditingCompletedResults(false)
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

    const resultUserIds = new Set(rows.map((item) => item.userId))
    const missingParticipants = participants
      .filter((item) => item.registration.status !== 'cancelled')
      .filter((item) => !resultUserIds.has(item.user.id))

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

    if (missingParticipants.length > 0) {
      setMissingResultsLogins(
        missingParticipants.map((participant) =>
          getParticipantDisplayName(participant.user),
        ),
      )
      setIsFinalizeDialogOpen(false)
      setIsMissingResultsDialogOpen(true)
      return
    }

    await finalizeTournamentWithRows(rows)
  }

  const finalizeTournamentWithRows = async (
    rows: Array<{
      userId: number
      place: number
      isItm: boolean
      points: number
      bounty: number
    }>,
  ) => {
    if (isFinalizingTournament) {
      return
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
    clearStoredResultsDraft()
    setResultsDraft({})
    setMissingResultsLogins([])
    setIsEditingCompletedResults(false)
    setIsFinalizeDialogOpen(false)
    setIsMissingResultsDialogOpen(false)
    success('Турнир завершён, результаты и очки сохранены')
  }

  const handleConfirmFinalizeWithMissingResults = async () => {
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

    await finalizeTournamentWithRows(rows)
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

  const handleDeleteResult = async (userId: number, resultId: number) => {
    if (pendingResultId !== null) {
      return
    }

    setPendingResultId(resultId)
    const deleted = await deleteResult(resultId)
    setPendingResultId(null)

    if (deleted) {
      setResultsDraft((previous) => {
        const next = { ...previous }
        delete next[userId]
        return next
      })
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
  const previewDateSource = localDate || new Date().toISOString()
  const previewLateRegistrationSource =
    localLateRegistrationEndsAt || previewDateSource
  const previewDateLabel = formatDateLabel(previewDateSource)
  const previewDateTimeLabel = formatDateTimeInputLabel(previewDateSource)
  const previewStartLabel = formatTimeLabel(previewDateSource)
  const previewLateRegistrationLabel = localLateRegistrationEndsAt
    ? formatTimeLabel(previewLateRegistrationSource)
    : null

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

  const handleCopyTelegramUsername = async (telegramUsername: string | null) => {
    if (!telegramUsername?.trim()) {
      error('Username не указан')
      return
    }

    try {
      await navigator.clipboard.writeText(`@${telegramUsername.trim()}`)
      success('Username скопирован')
    } catch (cause) {
      console.error(cause)
      error('Не удалось скопировать username')
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
            label="Вход до"
            inputProps={{
              type: 'datetime-local',
              value: localLateRegistrationEndsAt,
              onChange: (event) => { setLocalLateRegistrationEndsAt(event.target.value); markDirty() },
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
          dateTimeLabel={previewDateTimeLabel}
          startLabel={previewStartLabel}
          lateRegistrationLabel={previewLateRegistrationLabel}
          seatsLabel={`0/${localMaxPlayersInput || 0}`}
          imageUrl={previewImage}
        />
        <TournamentDetailPreview
          name={localName}
          dateLabel={previewDateLabel}
          dateTimeLabel={previewDateTimeLabel}
          startLabel={previewStartLabel}
          lateRegistrationLabel={previewLateRegistrationLabel}
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
            <input
              type="search"
              value={participantQuery}
              onChange={(event) => setParticipantQuery(event.target.value)}
              placeholder="Поиск по нику, @username, имени или ID"
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-indigo-100 md:w-96"
            />
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
                    label: getParticipantSelectLabel(item),
                  })),
                ]}
                value={newUserId}
                onChange={handleSelectUser}
                placeholder="Поиск по нику или имени..."
                disabled={isAddingUser}
                disabledLabel="Добавляем пользователя..."
              />
            </div>
            <button
              type="button"
              onClick={() => setIsManualUserDialogOpen(true)}
              disabled={isAddingUser || isCreatingManualUser}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Добавить вручную
            </button>
          </div>
        </div>

        <DataTable
          rows={orderedParticipants}
          getRowKey={(row) => row.registration.id}
          columns={[
            { header: '№', render: (row) => row.displayOrder },
            { header: 'Ник', render: (row) => row.user.login || '—' },
            { header: 'Имя', render: (row) => row.user.name || '—' },
            {
              header: 'Username',
              render: (row) =>
                row.user.telegramUsername ? (
                  <button
                    type="button"
                    onClick={() => void handleCopyTelegramUsername(row.user.telegramUsername)}
                    className="font-medium text-[var(--accent)] transition hover:underline"
                  >
                    @{row.user.telegramUsername}
                  </button>
                ) : (
                  '—'
                ),
            },
            {
              header: 'Регистрация',
              render: (row) => <StatusBadge status={row.registration.status} />,
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
            {isTournamentCompleted ? (
              <button
                type="button"
                onClick={() => setIsEditingCompletedResults(true)}
                disabled={isEditingCompletedResults}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEditingCompletedResults
                  ? 'Результаты редактируются'
                  : 'Редактировать результаты'}
              </button>
            ) : null}
            {isTournamentCompleted ? (
              <>
                <button
                  type="button"
                  disabled
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Сохранить и завершить турнир
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveResults()}
                  disabled={!isEditingCompletedResults || isSavingResults}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingResults ? 'Сохраняем...' : 'Сохранить результат'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleOpenFinalizeDialog}
                disabled={isFinalizingTournament}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFinalizingTournament
                  ? 'Сохраняем и завершаем...'
                  : 'Сохранить и завершить турнир'}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-gray-50/60 p-4">
          <div className="mb-3 space-y-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Добавить результат участника
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Найди участника турнира, заполни его место, очки, баунти и добавь в
              список результатов.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,2.1fr)_110px_90px_110px_110px_auto]">
            <SearchableSelect
              label="Участник"
              options={resultParticipantOptions}
              value={resultEntryUserId}
              onChange={setResultEntryUserId}
              placeholder="Поиск по нику, @username или имени"
              disabled={
                resultParticipantOptions.length === 0 ||
                (isTournamentCompleted && !isEditingCompletedResults)
              }
              disabledLabel={
                resultParticipantOptions.length === 0
                  ? 'Все участники уже добавлены'
                  : undefined
              }
            />

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Место
              </span>
              <input
                type="number"
                min={1}
                value={resultEntryDraft.place}
                onFocus={replaceLeadingZeroOnFocus}
                onChange={(event) =>
                  setResultEntryField('place', Number(event.target.value || 0))
                }
                disabled={isTournamentCompleted && !isEditingCompletedResults}
                className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-[var(--text-muted)]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                ITM
              </span>
              <label className="flex h-[42px] items-center rounded-lg border border-[var(--line)] bg-white px-3">
                <input
                  type="checkbox"
                  checked={resultEntryDraft.isItm}
                  onChange={(event) =>
                    setResultEntryField('isItm', event.target.checked)
                  }
                  disabled={isTournamentCompleted && !isEditingCompletedResults}
                  className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Очки
              </span>
              <input
                type="number"
                value={resultEntryDraft.points}
                onFocus={replaceLeadingZeroOnFocus}
                onChange={(event) =>
                  setResultEntryField('points', Number(event.target.value || 0))
                }
                disabled={isTournamentCompleted && !isEditingCompletedResults}
                className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-[var(--text-muted)]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Баунти
              </span>
              <input
                type="number"
                value={resultEntryDraft.bounty}
                onFocus={replaceLeadingZeroOnFocus}
                onChange={(event) =>
                  setResultEntryField('bounty', Number(event.target.value || 0))
                }
                disabled={isTournamentCompleted && !isEditingCompletedResults}
                className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-[var(--text-muted)]"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddResultEntry}
                disabled={
                  resultEntryUserId === 'none' ||
                  (resultEntryDraft.points <= 0 && resultEntryDraft.bounty <= 0) ||
                  (isTournamentCompleted && !isEditingCompletedResults)
                }
                className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>

        {duplicateResultPlaces.length > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Повторяются места: {duplicateResultPlaces.join(', ')}.
          </div>
        ) : null}

        {missingResultPlaces.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Пропущены места: {missingResultPlaces.join(', ')}.
          </div>
        ) : null}

        <DataTable
          rows={enteredResultsParticipants}
          getRowKey={(row) => row.user.id}
          emptyLabel="Результаты ещё не внесены"
          columns={[
            { header: 'Игрок', render: (row) => getParticipantDisplayName(row.user) },
            {
              header: 'Регистрация',
              render: (row) => <StatusBadge status={row.registration.status} />,
            },
            {
              header: 'Место',
              render: (row) => {
                const hasResultData = hasAnyResultData(row.user.id, row.result)
                const isRowDisabled =
                  (row.user.isPrepayRequired && !hasResultData) ||
                  (isTournamentCompleted && !isEditingCompletedResults)

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
                const hasResultData = hasAnyResultData(row.user.id, row.result)
                const isRowDisabled =
                  (row.user.isPrepayRequired && !hasResultData) ||
                  (isTournamentCompleted && !isEditingCompletedResults)

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
                const hasResultData = hasAnyResultData(row.user.id, row.result)
                const isRowDisabled =
                  (row.user.isPrepayRequired && !hasResultData) ||
                  (isTournamentCompleted && !isEditingCompletedResults)

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
                const hasResultData = hasAnyResultData(row.user.id, row.result)
                const isRowDisabled =
                  (row.user.isPrepayRequired && !hasResultData) ||
                  (isTournamentCompleted && !isEditingCompletedResults)

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
                        onClick={() =>
                          void handleSetPrepay(
                            row.user.id,
                            getParticipantDisplayName(row.user),
                          )
                        }
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
                            void handleDeleteResult(row.user.id, currentResult.id)
                          }
                          disabled={
                            pendingResultId !== null ||
                            (isTournamentCompleted && !isEditingCompletedResults)
                          }
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

      {isManualUserDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-gray-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[var(--line)] bg-white p-6 shadow-2xl">
            <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[var(--text-primary)]">
              Добавить участника вручную
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Создадим ручного пользователя в базе и сразу добавим его в этот турнир. Ник можно не заполнять, если есть только имя.
            </p>

            <div className="mt-4 space-y-3">
              <FormField
                label="Ник"
                inputProps={{
                  value: manualUserLogin,
                  onChange: (event) => setManualUserLogin(event.target.value),
                  placeholder: 'Необязательно',
                }}
              />

              <FormField
                label="Имя"
                inputProps={{
                  value: manualUserName,
                  onChange: (event) => setManualUserName(event.target.value),
                  placeholder: 'Например, Иван офлайн',
                }}
              />

              <FormField
                label="Telegram username"
                inputProps={{
                  value: manualTelegramUsername,
                  onChange: (event) =>
                    setManualTelegramUsername(event.target.value.replace(/^@+/, '')),
                  placeholder: 'Необязательно, без @',
                }}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isCreatingManualUser) {
                    return
                  }

                  setIsManualUserDialogOpen(false)
                  setManualUserLogin('')
                  setManualUserName('')
                  setManualTelegramUsername('')
                }}
                disabled={isCreatingManualUser}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleCreateManualUser()}
                disabled={isCreatingManualUser}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingManualUser ? 'Создаём...' : 'Создать и добавить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      {isMissingResultsDialogOpen ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-gray-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-[var(--line)] bg-white p-6 shadow-2xl">
            <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[var(--text-primary)]">
              Вы не внесли результаты
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Для этих участников результаты не заполнены. Они будут помечены как
              не пришедшие и попадут в лист предоплаты.
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <ul className="space-y-1 text-sm text-amber-900">
                {missingResultsLogins.map((login) => (
                  <li key={login}>• {login}</li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isFinalizingTournament) {
                    return
                  }

                  setIsMissingResultsDialogOpen(false)
                }}
                disabled={isFinalizingTournament}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Отменить
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmFinalizeWithMissingResults()}
                disabled={isFinalizingTournament}
                className="rounded-lg bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFinalizingTournament ? 'Завершаем...' : 'Да'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
