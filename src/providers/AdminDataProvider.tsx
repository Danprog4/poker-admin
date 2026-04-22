/* eslint-disable react-refresh/only-export-components */
import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useMemo, useState } from 'react'

import type {
  Achievement,
  AdminDataState,
  AdminStatus,
  Broadcast,
  BroadcastTargetFilter,
  ClubSeries,
  ClubUser,
  CreateAchievementInput,
  CreateAdjustmentInput,
  CreateBroadcastInput,
  CreateSeriesInput,
  CreateStatusInput,
  CreateTournamentInput,
  DashboardStats,
  FinalizeTournamentInput,
  PointAdjustment,
  RegistrationStatus,
  SeriesRatingRow,
  Tournament,
  TournamentRegistration,
  TournamentResult,
  TournamentResultInput,
  TournamentStatus,
  UpdateTournamentInput,
  UserAchievement,
} from '../lib/admin-models'
import { dateInputToIso, dateTimeInputToIso } from '../lib/date'
import { trpc } from '../lib/trpc'

const EMPTY_STATE: AdminDataState = {
  statuses: [],
  achievements: [],
  series: [],
  tournaments: [],
  users: [],
  registrations: [],
  results: [],
  adjustments: [],
  userAchievements: [],
  broadcasts: [],
}

const byDateDesc = <T extends { createdAt: string }>(a: T, b: T) =>
  new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()

const toIso = (value: unknown) => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)

    return Number.isNaN(parsed.valueOf()) ? value : parsed.toISOString()
  }

  return new Date().toISOString()
}

type RawStatus = {
  id: number
  name: string
  slug: string
  description?: string | null
  activeImageUrl?: string | null
  inactiveImageUrl?: string | null
  perkDescription?: string | null
  requirements?: string | null
  isManualOnly?: boolean | null
  sortOrder?: number | null
  createdAt: string | Date
}

type RawAchievement = {
  id: number
  name: string
  slug: string
  description?: string | null
  category?: string | null
  iconUrl?: string | null
  inactiveIconUrl?: string | null
  sortOrder?: number | null
  createdAt: string | Date
}

type RawSeries = {
  id: number
  name: string
  startDate: string | Date
  endDate: string | Date
  isActive?: boolean | null
  isArchived?: boolean | null
  createdAt: string | Date
}

type RawTournament = {
  id: number
  seriesId?: number | null
  medalId?: number | null
  name: string
  description?: string | null
  format?: string | null
  imageUrl?: string | null
  address?: string | null
  locationHint?: string | null
  date: string | Date
  lateRegistrationEndsAt?: string | Date | null
  maxPlayers?: number | null
  prizeInfo?: string | null
  isSignificant?: boolean | null
  status: TournamentStatus
  createdAt: string | Date
}

type RawUser = {
  id: number
  login?: string | null
  telegramUsername?: string | null
  name?: string | null
  statusId?: number | null
  isPrepayRequired?: boolean | null
  isPrepayExempt?: boolean | null
  isOnboarded?: boolean | null
  createdAt: string | Date
}

type RawRegistration = {
  id: number
  userId: number
  tournamentId: number
  registrationNumber: number
  status: RegistrationStatus
  hasTopRatingBadge?: boolean | null
  hasPreviousWinnerBadge?: boolean | null
  confirmedAt?: string | Date | null
  cancelledAt?: string | Date | null
  createdAt: string | Date
}

type RawResult = {
  id: number
  userId: number
  tournamentId: number
  place?: number | null
  isItm?: boolean | null
  points?: number | null
  bounty?: number | null
  createdAt: string | Date
}

type RawAdjustment = {
  id: number
  userId: number
  seriesId: number
  points: number
  bounty: number
  reason: string
  createdAt: string | Date
}

type RawUserAchievement = {
  id: number
  userId: number
  achievementId: number
  awardedAt: string | Date
}

type RawBroadcast = {
  id: number
  message: string
  imageUrl?: string | null
  targetFilter: BroadcastTargetFilter
  targetUserIds?: number[] | string | null
  targetSeriesId?: number | null
  targetTournamentId?: number | null
  sentCount?: number | null
  status: Broadcast['status']
  sentAt?: string | Date | null
  createdAt: string | Date
}

type MutationResult = {
  ok: boolean
  errorMessage: string | null
}

type RawBootstrapState = {
  statuses?: RawStatus[]
  achievements?: RawAchievement[]
  series?: RawSeries[]
  tournaments?: RawTournament[]
  users?: RawUser[]
  registrations?: RawRegistration[]
  results?: RawResult[]
  adjustments?: RawAdjustment[]
  userAchievements?: RawUserAchievement[]
  broadcasts?: RawBroadcast[]
}

const normalizeSeriesList = (series: RawSeries[] | undefined, includeArchived = false) =>
  (series ?? [])
    .filter((item) => includeArchived || !item.isArchived)
    .map(
      (item): ClubSeries => ({
        id: item.id,
        name: item.name,
        startDate: toIso(item.startDate),
        endDate: toIso(item.endDate),
        isActive: Boolean(item.isActive),
        createdAt: toIso(item.createdAt),
      }),
    )

const normalizeState = (raw: RawBootstrapState | null | undefined): AdminDataState => {
  const toNumberArray = (value: number[] | string | null | undefined) => {
    if (Array.isArray(value)) {
      return value.filter((item) => Number.isInteger(item))
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown

        return Array.isArray(parsed)
          ? parsed.filter((item): item is number => Number.isInteger(item))
          : []
      } catch {
        return []
      }
    }

    return []
  }

  return {
    statuses: (raw?.statuses ?? []).map(
      (item): AdminStatus => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description ?? null,
        activeImageUrl: item.activeImageUrl ?? null,
        inactiveImageUrl: item.inactiveImageUrl ?? null,
        perkDescription: item.perkDescription ?? null,
        requirements: item.requirements ?? '{}',
        isManualOnly: Boolean(item.isManualOnly),
        sortOrder: item.sortOrder ?? 0,
        createdAt: toIso(item.createdAt),
      }),
    ),
    achievements: (raw?.achievements ?? []).map(
      (item): Achievement => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description ?? null,
        category: item.category ?? null,
        iconUrl: item.iconUrl ?? null,
        inactiveIconUrl: item.inactiveIconUrl ?? null,
        sortOrder: item.sortOrder ?? 0,
        createdAt: toIso(item.createdAt),
      }),
    ),
    series: normalizeSeriesList(raw?.series),
    tournaments: (raw?.tournaments ?? []).map(
      (item): Tournament => ({
        id: item.id,
        seriesId: item.seriesId ?? null,
        medalId: item.medalId ?? null,
        name: item.name,
        description: item.description ?? '',
        format: item.format ?? '',
        imageUrl: item.imageUrl ?? null,
        address: item.address ?? '',
        locationHint: item.locationHint ?? '',
        date: toIso(item.date),
        lateRegistrationEndsAt: item.lateRegistrationEndsAt
          ? toIso(item.lateRegistrationEndsAt)
          : null,
        maxPlayers: item.maxPlayers ?? 0,
        prizeInfo: item.prizeInfo ?? '',
        isSignificant: Boolean(item.isSignificant),
        status: item.status,
        createdAt: toIso(item.createdAt),
      }),
    ),
    users: (raw?.users ?? []).map(
      (item): ClubUser => ({
        id: item.id,
        login: item.login ?? '',
        telegramUsername: item.telegramUsername ?? null,
        name: item.name ?? '',
        statusId: item.statusId ?? null,
        isPrepayRequired: Boolean(item.isPrepayRequired),
        isPrepayExempt: Boolean(item.isPrepayExempt),
        isOnboarded: Boolean(item.isOnboarded),
        createdAt: toIso(item.createdAt),
      }),
    ),
    registrations: (raw?.registrations ?? []).map(
      (item): TournamentRegistration => ({
        id: item.id,
        userId: item.userId,
        tournamentId: item.tournamentId,
        registrationNumber: item.registrationNumber,
        status: item.status as RegistrationStatus,
        hasTopRatingBadge: Boolean(item.hasTopRatingBadge),
        hasPreviousWinnerBadge: Boolean(item.hasPreviousWinnerBadge),
        confirmedAt: item.confirmedAt ? toIso(item.confirmedAt) : null,
        cancelledAt: item.cancelledAt ? toIso(item.cancelledAt) : null,
        createdAt: toIso(item.createdAt),
      }),
    ),
    results: (raw?.results ?? []).map(
      (item): TournamentResult => ({
        id: item.id,
        userId: item.userId,
        tournamentId: item.tournamentId,
        place: item.place ?? 0,
        isItm: Boolean(item.isItm),
        points: item.points ?? 0,
        bounty: item.bounty ?? 0,
        createdAt: toIso(item.createdAt),
      }),
    ),
    adjustments: (raw?.adjustments ?? []).map(
      (item): PointAdjustment => ({
        id: item.id,
        userId: item.userId,
        seriesId: item.seriesId,
        points: item.points,
        bounty: item.bounty,
        reason: item.reason,
        createdAt: toIso(item.createdAt),
      }),
    ),
    userAchievements: (raw?.userAchievements ?? []).map(
      (item): UserAchievement => ({
        id: item.id,
        userId: item.userId,
        achievementId: item.achievementId,
        awardedAt: toIso(item.awardedAt),
      }),
    ),
    broadcasts: (raw?.broadcasts ?? []).map(
      (item): Broadcast => ({
        id: item.id,
        message: item.message,
        imageUrl: item.imageUrl ?? null,
        targetFilter: item.targetFilter,
        targetUserIds: toNumberArray(item.targetUserIds),
        targetSeriesId: item.targetSeriesId ?? null,
        targetTournamentId: item.targetTournamentId ?? null,
        sentCount: item.sentCount ?? 0,
        status: item.status,
        sentAt: item.sentAt ? toIso(item.sentAt) : null,
        createdAt: toIso(item.createdAt),
      }),
    ),
  }
}

type TournamentParticipant = {
  registration: TournamentRegistration
  user: ClubUser
  result: TournamentResult | null
}

type UserTournamentHistoryRow = {
  tournament: Tournament
  result: TournamentResult | null
  registration: TournamentRegistration | null
}

type AdminDataContextValue = {
  state: AdminDataState
  isBootstrapping: boolean
  hasBootstrapped: boolean
  bootstrapErrorMessage: string | null
  dashboardStats: DashboardStats
  activeSeries: ClubSeries | null
  ratingsBySeriesId: Record<number, SeriesRatingRow[]>
  retryBootstrap: () => Promise<boolean>
  getSeriesById: (seriesId: number | null) => ClubSeries | null
  getStatusById: (statusId: number | null) => AdminStatus | null
  getUserById: (userId: number) => ClubUser | null
  getTournamentById: (tournamentId: number) => Tournament | null
  getTournamentParticipants: (tournamentId: number) => TournamentParticipant[]
  getUserHistory: (userId: number) => UserTournamentHistoryRow[]
  getUserAchievements: (userId: number) => Array<{ link: UserAchievement; achievement: Achievement }>
  getUserAdjustments: (userId: number) => PointAdjustment[]
  countBroadcastRecipients: (
    targetFilter: BroadcastTargetFilter,
    targetSeriesId: number | null,
    targetTournamentId: number | null,
    targetUserIds?: number[] | null,
  ) => number
  createTournament: (input: CreateTournamentInput) => Promise<boolean>
  updateTournament: (tournamentId: number, input: UpdateTournamentInput) => Promise<boolean>
  finalizeTournament: (
    tournamentId: number,
    input: FinalizeTournamentInput,
  ) => Promise<boolean>
  deleteTournament: (tournamentId: number) => Promise<boolean>
  updateTournamentStatus: (tournamentId: number, status: TournamentStatus) => Promise<boolean>
  addRegistration: (tournamentId: number, userId: number) => Promise<MutationResult>
  cancelRegistration: (registrationId: number) => Promise<boolean>
  confirmRegistration: (registrationId: number) => Promise<boolean>
  updateRegistrationBadges: (
    registrationId: number,
    input: {
      hasTopRatingBadge?: boolean
      hasPreviousWinnerBadge?: boolean
    },
  ) => Promise<boolean>
  moveFromWaitlist: (registrationId: number) => Promise<boolean>
  saveTournamentResults: (tournamentId: number, rows: TournamentResultInput[]) => Promise<boolean>
  importTournamentResults: (
    tournamentId: number,
    nicknames: string[],
  ) => Promise<{ unresolved: string[]; errorMessage: string | null }>
  updateResult: (
    resultId: number,
    values: Partial<Omit<TournamentResult, 'id' | 'createdAt'>>,
  ) => Promise<boolean>
  deleteResult: (resultId: number) => Promise<boolean>
  createSeries: (input: CreateSeriesInput) => Promise<boolean>
  updateSeries: (seriesId: number, input: Partial<CreateSeriesInput>) => Promise<boolean>
  activateSeries: (seriesId: number) => Promise<boolean>
  deleteSeries: (seriesId: number) => Promise<boolean>
  setUserPrepay: (
    userId: number,
    mode: 'required' | 'optional' | 'never',
    message?: string,
  ) => Promise<boolean>
  setUserStatus: (userId: number, statusId: number | null) => Promise<boolean>
  updateUserLogin: (userId: number, login: string) => Promise<boolean>
  createManualUser: (input: {
    login?: string
    name?: string
    telegramUsername?: string
  }) => Promise<{ user: ClubUser | null; errorMessage: string | null }>
  findManualUserCandidate: (input: {
    login?: string
    telegramUsername?: string
  }) => Promise<ClubUser | null>
  createAdjustment: (input: CreateAdjustmentInput) => Promise<boolean>
  deleteAdjustment: (adjustmentId: number) => Promise<boolean>
  createStatus: (input: CreateStatusInput) => Promise<boolean>
  updateStatus: (statusId: number, input: Partial<CreateStatusInput>) => Promise<boolean>
  deleteStatus: (statusId: number) => Promise<boolean>
  createAchievement: (input: CreateAchievementInput) => Promise<Achievement | null>
  updateAchievement: (
    achievementId: number,
    input: Partial<CreateAchievementInput>,
  ) => Promise<boolean>
  deleteAchievement: (achievementId: number) => Promise<boolean>
  awardAchievement: (userId: number, achievementId: number) => Promise<boolean>
  revokeAchievement: (userId: number, achievementId: number) => Promise<boolean>
  createBroadcast: (input: CreateBroadcastInput) => Promise<number>
  updateBroadcast: (broadcastId: number, input: Partial<CreateBroadcastInput>) => Promise<boolean>
  deleteBroadcast: (broadcastId: number) => Promise<boolean>
  sendBroadcast: (broadcastId: number) => Promise<boolean>
  resetData: () => Promise<boolean>
}

export const AdminDataContext = createContext<AdminDataContextValue | null>(null)

export function AdminDataProvider({ children }: PropsWithChildren) {
  const [nowTs] = useState(() => Date.now())
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<number[]>([])
  const meQuery = trpc.adminAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  })

  const bootstrapQuery = trpc.admin.bootstrap.useQuery(undefined, {
    staleTime: 0,
    retry: 1,
    enabled: meQuery.status === 'success',
  })

  const createTournamentMutation = trpc.admin.tournaments.create.useMutation()
  const updateTournamentMutation = trpc.admin.tournaments.update.useMutation()
  const finalizeTournamentMutation = trpc.admin.tournaments.finalize.useMutation()
  const deleteTournamentMutation = trpc.admin.tournaments.delete.useMutation()
  const updateTournamentStatusMutation = trpc.admin.tournaments.updateStatus.useMutation()

  const addRegistrationMutation = trpc.admin.registrations.add.useMutation()
  const cancelRegistrationMutation = trpc.admin.registrations.cancel.useMutation()
  const confirmRegistrationMutation = trpc.admin.registrations.confirm.useMutation()
  const updateRegistrationBadgesMutation =
    trpc.admin.registrations.updateBadges.useMutation()
  const moveFromWaitlistMutation =
    trpc.admin.registrations.moveFromWaitlist.useMutation()

  const enterResultsMutation = trpc.admin.results.enter.useMutation()
  const importResultsMutation = trpc.admin.results.importByOrder.useMutation()
  const updateResultMutation = trpc.admin.results.update.useMutation()
  const deleteResultMutation = trpc.admin.results.delete.useMutation()

  const createSeriesMutation = trpc.admin.series.create.useMutation()
  const updateSeriesMutation = trpc.admin.series.update.useMutation()
  const activateSeriesMutation = trpc.admin.series.activate.useMutation()
  const deleteSeriesMutation = trpc.admin.series.delete.useMutation()

  const setUserPrepayMutation = trpc.admin.users.setPrepay.useMutation()
  const setUserStatusMutation = trpc.admin.users.setStatus.useMutation()
  const updateUserLoginMutation = trpc.admin.users.updateLogin.useMutation()
  const findManualUserCandidateMutation =
    trpc.admin.users.findManualCandidate.useMutation()
  const createManualUserMutation = trpc.admin.users.createManual.useMutation()

  const createAdjustmentMutation = trpc.admin.adjustments.create.useMutation()
  const deleteAdjustmentMutation = trpc.admin.adjustments.delete.useMutation()

  const createStatusMutation = trpc.admin.statuses.create.useMutation()
  const updateStatusMutation = trpc.admin.statuses.update.useMutation()
  const deleteStatusMutation = trpc.admin.statuses.delete.useMutation()

  const createAchievementMutation = trpc.admin.achievements.create.useMutation()
  const updateAchievementMutation = trpc.admin.achievements.update.useMutation()
  const deleteAchievementMutation = trpc.admin.achievements.delete.useMutation()
  const awardAchievementMutation = trpc.admin.achievements.award.useMutation()
  const revokeAchievementMutation = trpc.admin.achievements.revoke.useMutation()

  const createBroadcastMutation = trpc.admin.broadcasts.create.useMutation()
  const updateBroadcastMutation = trpc.admin.broadcasts.update.useMutation()
  const deleteBroadcastMutation = trpc.admin.broadcasts.delete.useMutation()
  const sendBroadcastMutation = trpc.admin.broadcasts.send.useMutation()

  const refresh = useCallback(async () => {
    const result = await bootstrapQuery.refetch()

    if (result.error) {
      throw result.error
    }

    return result.data
  }, [bootstrapQuery])

  const runAndRefresh = useCallback(
    async <T,>(operation: () => Promise<T>) => {
      try {
        const result = await operation()
        await refresh()
        return result
      } catch (error) {
        console.error(error)
        return null as T | null
      }
    },
    [refresh],
  )

  const retryBootstrap = useCallback(async () => {
    try {
      await refresh()
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }, [refresh])

  const state = useMemo(() => {
    if (!bootstrapQuery.data) {
      return EMPTY_STATE
    }

    const nextState = normalizeState(bootstrapQuery.data)

    if (hiddenSeriesIds.length === 0) {
      return nextState
    }

    return {
      ...nextState,
      series: nextState.series.filter((item) => !hiddenSeriesIds.includes(item.id)),
    }
  }, [bootstrapQuery.data, hiddenSeriesIds])

  const allSeries = useMemo(
    () =>
      normalizeSeriesList(bootstrapQuery.data?.series, true).filter(
        (item) => !hiddenSeriesIds.includes(item.id),
      ),
    [bootstrapQuery.data?.series, hiddenSeriesIds],
  )

  const isBootstrapping = bootstrapQuery.isPending && !bootstrapQuery.data
  const hasBootstrapped = Boolean(bootstrapQuery.data)
  const bootstrapErrorMessage =
    bootstrapQuery.error instanceof Error ? bootstrapQuery.error.message : null

  const getSeriesById = useCallback(
    (seriesId: number | null) => allSeries.find((item) => item.id === seriesId) ?? null,
    [allSeries],
  )

  const getStatusById = useCallback(
    (statusId: number | null) =>
      state.statuses.find((item) => item.id === statusId) ?? null,
    [state.statuses],
  )

  const getUserById = useCallback(
    (userId: number) => state.users.find((item) => item.id === userId) ?? null,
    [state.users],
  )

  const getTournamentById = useCallback(
    (tournamentId: number) =>
      state.tournaments.find((item) => item.id === tournamentId) ?? null,
    [state.tournaments],
  )

  const getTournamentParticipants = useCallback(
    (tournamentId: number) => {
      const registrations = state.registrations
        .filter(
          (item) =>
            item.tournamentId === tournamentId && item.status !== 'cancelled',
        )
        .sort((a, b) => a.registrationNumber - b.registrationNumber)

      return registrations
        .map((registration) => {
          const user = state.users.find((item) => item.id === registration.userId)

          if (!user) {
            return null
          }

          const result =
            state.results.find(
              (item) =>
                item.tournamentId === tournamentId && item.userId === registration.userId,
            ) ?? null

          return {
            registration,
            user,
            result,
          }
        })
        .filter((item): item is TournamentParticipant => item !== null)
    },
    [state.registrations, state.results, state.users],
  )

  const getUserHistory = useCallback(
    (userId: number) => {
      return state.tournaments
        .map((tournament) => {
          const registration =
            state.registrations.find(
              (item) => item.tournamentId === tournament.id && item.userId === userId,
            ) ?? null

          const result =
            state.results.find(
              (item) => item.tournamentId === tournament.id && item.userId === userId,
            ) ?? null

          return {
            tournament,
            registration,
            result,
          }
        })
        .filter((item) => item.registration || item.result)
        .sort(
          (a, b) =>
            new Date(b.tournament.date).valueOf() - new Date(a.tournament.date).valueOf(),
        )
    },
    [state.registrations, state.results, state.tournaments],
  )

  const getUserAchievements = useCallback(
    (userId: number) => {
      return state.userAchievements
        .filter((item) => item.userId === userId)
        .map((link) => {
          const achievement = state.achievements.find(
            (item) => item.id === link.achievementId,
          )

          if (!achievement) {
            return null
          }

          return { link, achievement }
        })
        .filter((item): item is { link: UserAchievement; achievement: Achievement } => item !== null)
    },
    [state.achievements, state.userAchievements],
  )

  const getUserAdjustments = useCallback(
    (userId: number) =>
      state.adjustments
        .filter((item) => item.userId === userId)
        .sort(byDateDesc),
    [state.adjustments],
  )

  const countBroadcastRecipients = useCallback(
    (
      targetFilter: BroadcastTargetFilter,
      targetSeriesId: number | null,
      targetTournamentId: number | null,
      targetUserIds?: number[] | null,
    ) => {
      if (targetFilter === 'users') {
        const selectedUserIds = new Set(targetUserIds ?? [])

        return state.users.filter(
          (item) => item.isOnboarded && selectedUserIds.has(item.id),
        ).length
      }

      if (targetFilter === 'registered') {
        if (!targetTournamentId) {
          return 0
        }

        return state.registrations.filter(
          (item) =>
            item.tournamentId === targetTournamentId && item.status !== 'cancelled',
        ).length
      }

      if (targetFilter === 'series') {
        if (!targetSeriesId) {
          return 0
        }

        const completedTournamentIds = state.tournaments
          .filter(
            (item) => item.seriesId === targetSeriesId && item.status === 'completed',
          )
          .map((item) => item.id)

        return new Set(
          state.results
            .filter((item) => completedTournamentIds.includes(item.tournamentId))
            .map((item) => item.userId),
        ).size
      }

      return state.users.filter((item) => item.isOnboarded).length
    },
    [state.registrations, state.results, state.tournaments, state.users],
  )

  const dashboardStats = useMemo(() => {
    const weekAgo = nowTs - 7 * 24 * 60 * 60 * 1000

    return {
      usersCount: state.users.length,
      tournamentsCount: state.tournaments.length,
      registrationsInLast7Days: state.registrations.filter(
        (item) => new Date(item.createdAt).valueOf() >= weekAgo,
      ).length,
    }
  }, [nowTs, state.registrations, state.tournaments.length, state.users.length])

  const ratingsBySeriesId = useMemo(() => {
    const tournamentById = new Map(state.tournaments.map((item) => [item.id, item]))
    const mapBySeries = new Map<number, Map<number, { points: number; bounty: number }>>()

    for (const result of state.results) {
      const tournament = tournamentById.get(result.tournamentId)

      if (!tournament?.seriesId || tournament.status !== 'completed') {
        continue
      }

      const seriesTotals =
        mapBySeries.get(tournament.seriesId) ?? new Map<number, { points: number; bounty: number }>()

      const current = seriesTotals.get(result.userId) ?? { points: 0, bounty: 0 }
      seriesTotals.set(result.userId, {
        points: current.points + result.points,
        bounty: current.bounty + result.bounty,
      })
      mapBySeries.set(tournament.seriesId, seriesTotals)
    }

    for (const adjustment of state.adjustments) {
      const seriesTotals =
        mapBySeries.get(adjustment.seriesId) ?? new Map<number, { points: number; bounty: number }>()
      const current = seriesTotals.get(adjustment.userId) ?? { points: 0, bounty: 0 }

      seriesTotals.set(adjustment.userId, {
        points: current.points + adjustment.points,
        bounty: current.bounty + adjustment.bounty,
      })
      mapBySeries.set(adjustment.seriesId, seriesTotals)
    }

    const result: Record<number, SeriesRatingRow[]> = {}

    for (const [seriesId, totalsMap] of mapBySeries.entries()) {
      result[seriesId] = Array.from(totalsMap.entries())
        .map(([userId, totals]) => ({
          userId,
          login: state.users.find((item) => item.id === userId)?.login ?? String(userId),
          totalPoints: totals.points,
          totalBounty: totals.bounty,
          rank: 0,
        }))
        .sort((a, b) => {
          if (b.totalPoints === a.totalPoints) {
            return b.totalBounty - a.totalBounty
          }

          return b.totalPoints - a.totalPoints
        })
        .map((item, index) => ({ ...item, rank: index + 1 }))
    }

    return result
  }, [state.adjustments, state.results, state.tournaments, state.users])

  const activeSeries = useMemo(
    () => state.series.find((item) => item.isActive) ?? null,
    [state.series],
  )

  const createTournament = useCallback(
    async (input: CreateTournamentInput) => {
      const result = await runAndRefresh(() =>
        createTournamentMutation.mutateAsync({
          name: input.name,
          description: input.description,
          format: input.format,
          address: input.address,
          locationHint: input.locationHint,
          date: dateTimeInputToIso(input.date),
          lateRegistrationEndsAt: input.lateRegistrationEndsAt
            ? dateTimeInputToIso(input.lateRegistrationEndsAt)
            : null,
          maxPlayers: input.maxPlayers,
          seriesId: input.seriesId,
          medalId: input.medalId,
          imageUrl: input.imageUrl,
          isSignificant: input.isSignificant,
          prizeInfo: input.prizeInfo,
        }),
      )

      return result !== null
    },
    [createTournamentMutation, runAndRefresh],
  )

  const updateTournament = useCallback(
    async (tournamentId: number, input: UpdateTournamentInput) => {
      const result = await runAndRefresh(() =>
        updateTournamentMutation.mutateAsync({
          tournamentId,
          ...input,
          date: input.date ? dateTimeInputToIso(input.date) : undefined,
          lateRegistrationEndsAt:
            input.lateRegistrationEndsAt !== undefined
              ? input.lateRegistrationEndsAt
                ? dateTimeInputToIso(input.lateRegistrationEndsAt)
                : null
              : undefined,
        }),
      )

      return result !== null
    },
    [runAndRefresh, updateTournamentMutation],
  )

  const finalizeTournament = useCallback(
    async (tournamentId: number, input: FinalizeTournamentInput) => {
      const result = await runAndRefresh(() =>
        finalizeTournamentMutation.mutateAsync({
          tournamentId,
          seriesId: input.seriesId,
          results: input.results,
        }),
      )

      return result !== null
    },
    [finalizeTournamentMutation, runAndRefresh],
  )

  const deleteTournament = useCallback(
    async (tournamentId: number) => {
      const result = await runAndRefresh(() =>
        deleteTournamentMutation.mutateAsync({ tournamentId }),
      )

      return result !== null
    },
    [deleteTournamentMutation, runAndRefresh],
  )

  const updateTournamentStatus = useCallback(
    async (tournamentId: number, status: TournamentStatus) => {
      const result = await runAndRefresh(() =>
        updateTournamentStatusMutation.mutateAsync({ tournamentId, status }),
      )

      return result !== null
    },
    [runAndRefresh, updateTournamentStatusMutation],
  )

  const addRegistration = useCallback(
    async (tournamentId: number, userId: number) => {
      try {
        await addRegistrationMutation.mutateAsync({ tournamentId, userId })
        await refresh()

        return { ok: true, errorMessage: null }
      } catch (error) {
        console.error(error)

        return {
          ok: false,
          errorMessage:
            error instanceof Error && error.message
              ? error.message
              : 'Не удалось добавить пользователя в турнир',
        }
      }
    },
    [addRegistrationMutation, refresh],
  )

  const cancelRegistration = useCallback(
    async (registrationId: number) => {
      const result = await runAndRefresh(() =>
        cancelRegistrationMutation.mutateAsync({ registrationId }),
      )

      return result !== null
    },
    [cancelRegistrationMutation, runAndRefresh],
  )

  const confirmRegistration = useCallback(
    async (registrationId: number) => {
      const result = await runAndRefresh(() =>
        confirmRegistrationMutation.mutateAsync({ registrationId }),
      )

      return result !== null
    },
    [confirmRegistrationMutation, runAndRefresh],
  )

  const updateRegistrationBadges = useCallback(
    async (
      registrationId: number,
      input: {
        hasTopRatingBadge?: boolean
        hasPreviousWinnerBadge?: boolean
      },
    ) => {
      const result = await runAndRefresh(() =>
        updateRegistrationBadgesMutation.mutateAsync({
          registrationId,
          ...input,
        }),
      )

      return result !== null
    },
    [runAndRefresh, updateRegistrationBadgesMutation],
  )

  const moveFromWaitlist = useCallback(
    async (registrationId: number) => {
      const result = await runAndRefresh(() =>
        moveFromWaitlistMutation.mutateAsync({ registrationId }),
      )

      return result !== null
    },
    [moveFromWaitlistMutation, runAndRefresh],
  )

  const saveTournamentResults = useCallback(
    async (tournamentId: number, rows: TournamentResultInput[]) => {
      const result = await runAndRefresh(() =>
        enterResultsMutation.mutateAsync({
          tournamentId,
          results: rows,
        }),
      )

      return result !== null
    },
    [enterResultsMutation, runAndRefresh],
  )

  const importTournamentResults = useCallback(
    async (tournamentId: number, nicknames: string[]) => {
      try {
        await importResultsMutation.mutateAsync({
          tournamentId,
          nicknameList: nicknames.join('\n'),
        })
        await refresh()

        return { unresolved: [], errorMessage: null }
      } catch (error) {
        const message = error instanceof Error ? error.message : ''

        if (message.startsWith('Unknown nicknames:')) {
          const unresolved = message
            .replace('Unknown nicknames:', '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)

          return { unresolved, errorMessage: null }
        }

        console.error(error)

        return {
          unresolved: [],
          errorMessage:
            error instanceof Error && error.message
              ? error.message
              : 'Не удалось импортировать результаты',
        }
      }

    },
    [importResultsMutation, refresh],
  )

  const updateResult = useCallback(
    async (
      resultId: number,
      values: Partial<Omit<TournamentResult, 'id' | 'createdAt'>>,
    ) => {
      const result = await runAndRefresh(() =>
        updateResultMutation.mutateAsync({
          resultId,
          place: values.place,
          isItm: values.isItm,
          points: values.points,
          bounty: values.bounty,
        }),
      )

      return result !== null
    },
    [runAndRefresh, updateResultMutation],
  )

  const deleteResult = useCallback(
    async (resultId: number) => {
      const result = await runAndRefresh(() =>
        deleteResultMutation.mutateAsync({ resultId }),
      )

      return result !== null
    },
    [deleteResultMutation, runAndRefresh],
  )

  const createSeries = useCallback(
    async (input: CreateSeriesInput) => {
      const result = await runAndRefresh(() =>
        createSeriesMutation.mutateAsync({
          name: input.name,
          startDate: dateInputToIso(input.startDate),
          endDate: dateInputToIso(input.endDate),
        }),
      )

      return result !== null
    },
    [createSeriesMutation, runAndRefresh],
  )

  const updateSeries = useCallback(
    async (seriesId: number, input: Partial<CreateSeriesInput>) => {
      const result = await runAndRefresh(() =>
        updateSeriesMutation.mutateAsync({
          seriesId,
          name: input.name,
          startDate: input.startDate ? dateInputToIso(input.startDate) : undefined,
          endDate: input.endDate ? dateInputToIso(input.endDate) : undefined,
        }),
      )

      return result !== null
    },
    [runAndRefresh, updateSeriesMutation],
  )

  const activateSeries = useCallback(
    async (seriesId: number) => {
      const result = await runAndRefresh(() =>
        activateSeriesMutation.mutateAsync({ seriesId }),
      )

      return result !== null
    },
    [activateSeriesMutation, runAndRefresh],
  )

  const deleteSeries = useCallback(
    async (seriesId: number) => {
      const result = await runAndRefresh(() =>
        deleteSeriesMutation.mutateAsync({ seriesId }),
      )

      if (result !== null) {
        setHiddenSeriesIds((previous) =>
          previous.includes(seriesId) ? previous : [...previous, seriesId],
        )
      }

      return result !== null
    },
    [deleteSeriesMutation, runAndRefresh],
  )

  const setUserPrepay = useCallback(
    async (
      userId: number,
      mode: 'required' | 'optional' | 'never',
      message?: string,
    ) => {
      const result = await runAndRefresh(() =>
        setUserPrepayMutation.mutateAsync({
          userId,
          prepayMode: mode,
          message,
        }),
      )

      return result !== null
    },
    [runAndRefresh, setUserPrepayMutation],
  )

  const setUserStatus = useCallback(
    async (userId: number, statusId: number | null) => {
      const result = await runAndRefresh(() =>
        setUserStatusMutation.mutateAsync({ userId, statusId }),
      )

      return result !== null
    },
    [runAndRefresh, setUserStatusMutation],
  )

  const updateUserLogin = useCallback(
    async (userId: number, login: string) => {
      const result = await runAndRefresh(() =>
        updateUserLoginMutation.mutateAsync({ userId, login }),
      )

      return result !== null
    },
    [runAndRefresh, updateUserLoginMutation],
  )

  const createManualUser = useCallback(
    async (input: { login?: string; name?: string; telegramUsername?: string }) => {
      try {
        const result = await createManualUserMutation.mutateAsync(input)
        await refresh()

        return {
          user: result as ClubUser,
          errorMessage: null,
        }
      } catch (error) {
        console.error(error)

        return {
          user: null,
          errorMessage:
            error instanceof Error ? error.message : 'Не удалось создать ручного участника',
        }
      }
    },
    [createManualUserMutation, refresh],
  )

  const findManualUserCandidate = useCallback(
    async (input: { login?: string; telegramUsername?: string }) => {
      return (await findManualUserCandidateMutation.mutateAsync(input)) as ClubUser | null
    },
    [findManualUserCandidateMutation],
  )

  const createAdjustment = useCallback(
    async (input: CreateAdjustmentInput) => {
      const result = await runAndRefresh(() =>
        createAdjustmentMutation.mutateAsync(input),
      )

      return result !== null
    },
    [createAdjustmentMutation, runAndRefresh],
  )

  const deleteAdjustment = useCallback(
    async (adjustmentId: number) => {
      const result = await runAndRefresh(() =>
        deleteAdjustmentMutation.mutateAsync({ adjustmentId }),
      )

      return result !== null
    },
    [deleteAdjustmentMutation, runAndRefresh],
  )

  const createStatus = useCallback(
    async (input: CreateStatusInput) => {
      const result = await runAndRefresh(() => createStatusMutation.mutateAsync(input))

      return result !== null
    },
    [createStatusMutation, runAndRefresh],
  )

  const updateStatus = useCallback(
    async (statusId: number, input: Partial<CreateStatusInput>) => {
      const result = await runAndRefresh(() =>
        updateStatusMutation.mutateAsync({ statusId, ...input }),
      )

      return result !== null
    },
    [runAndRefresh, updateStatusMutation],
  )

  const deleteStatus = useCallback(
    async (statusId: number) => {
      const result = await runAndRefresh(() =>
        deleteStatusMutation.mutateAsync({ statusId }),
      )

      return result !== null
    },
    [deleteStatusMutation, runAndRefresh],
  )

  const createAchievement = useCallback(
    async (input: CreateAchievementInput) => {
      const created = await runAndRefresh(() => createAchievementMutation.mutateAsync(input))

      return (created as Achievement | null) ?? null
    },
    [createAchievementMutation, runAndRefresh],
  )

  const updateAchievement = useCallback(
    async (achievementId: number, input: Partial<CreateAchievementInput>) => {
      const result = await runAndRefresh(() =>
        updateAchievementMutation.mutateAsync({ achievementId, ...input }),
      )

      return result !== null
    },
    [runAndRefresh, updateAchievementMutation],
  )

  const deleteAchievement = useCallback(
    async (achievementId: number) => {
      const result = await runAndRefresh(() =>
        deleteAchievementMutation.mutateAsync({ achievementId }),
      )

      return result !== null
    },
    [deleteAchievementMutation, runAndRefresh],
  )

  const awardAchievement = useCallback(
    async (userId: number, achievementId: number) => {
      const result = await runAndRefresh(() =>
        awardAchievementMutation.mutateAsync({ userId, achievementId }),
      )

      return result !== null
    },
    [awardAchievementMutation, runAndRefresh],
  )

  const revokeAchievement = useCallback(
    async (userId: number, achievementId: number) => {
      const result = await runAndRefresh(() =>
        revokeAchievementMutation.mutateAsync({ userId, achievementId }),
      )

      return result !== null
    },
    [revokeAchievementMutation, runAndRefresh],
  )

  const createBroadcast = useCallback(
    async (input: CreateBroadcastInput) => {
      try {
        const created = await createBroadcastMutation.mutateAsync(input)
        await refresh()

        return created.id
      } catch (error) {
        console.error(error)

        return 0
      }
    },
    [createBroadcastMutation, refresh],
  )

  const updateBroadcast = useCallback(
    async (broadcastId: number, input: Partial<CreateBroadcastInput>) => {
      const result = await runAndRefresh(() =>
        updateBroadcastMutation.mutateAsync({
          broadcastId,
          message: input.message,
          imageUrl: input.imageUrl,
          targetFilter: input.targetFilter,
          targetUserIds: input.targetUserIds,
          targetSeriesId: input.targetSeriesId,
          targetTournamentId: input.targetTournamentId,
        }),
      )

      return result !== null
    },
    [runAndRefresh, updateBroadcastMutation],
  )

  const deleteBroadcast = useCallback(
    async (broadcastId: number) => {
      const result = await runAndRefresh(() =>
        deleteBroadcastMutation.mutateAsync({ broadcastId }),
      )

      return result !== null
    },
    [deleteBroadcastMutation, runAndRefresh],
  )

  const sendBroadcast = useCallback(
    async (broadcastId: number) => {
      const result = await runAndRefresh(() =>
        sendBroadcastMutation.mutateAsync({ broadcastId }),
      )

      return result !== null
    },
    [runAndRefresh, sendBroadcastMutation],
  )

  const resetData = useCallback(async () => {
    try {
      await refresh()
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }, [refresh])

  const value = useMemo<AdminDataContextValue>(
    () => ({
      state,
      isBootstrapping,
      hasBootstrapped,
      bootstrapErrorMessage,
      dashboardStats,
      activeSeries,
      ratingsBySeriesId,
      retryBootstrap,
      getSeriesById,
      getStatusById,
      getUserById,
      getTournamentById,
      getTournamentParticipants,
      getUserHistory,
      getUserAchievements,
      getUserAdjustments,
      countBroadcastRecipients,
      createTournament,
      updateTournament,
      finalizeTournament,
      deleteTournament,
      updateTournamentStatus,
      addRegistration,
      cancelRegistration,
      confirmRegistration,
      updateRegistrationBadges,
      moveFromWaitlist,
      saveTournamentResults,
      importTournamentResults,
      updateResult,
      deleteResult,
      createSeries,
      updateSeries,
      activateSeries,
      deleteSeries,
      setUserPrepay,
      setUserStatus,
      updateUserLogin,
      createManualUser,
      findManualUserCandidate,
      createAdjustment,
      deleteAdjustment,
      createStatus,
      updateStatus,
      deleteStatus,
      createAchievement,
      updateAchievement,
      deleteAchievement,
      awardAchievement,
      revokeAchievement,
      createBroadcast,
      updateBroadcast,
      deleteBroadcast,
      sendBroadcast,
      resetData,
    }),
    [
      state,
      isBootstrapping,
      hasBootstrapped,
      bootstrapErrorMessage,
      dashboardStats,
      activeSeries,
      ratingsBySeriesId,
      retryBootstrap,
      getSeriesById,
      getStatusById,
      getUserById,
      getTournamentById,
      getTournamentParticipants,
      getUserHistory,
      getUserAchievements,
      getUserAdjustments,
      countBroadcastRecipients,
      createTournament,
      updateTournament,
      finalizeTournament,
      deleteTournament,
      updateTournamentStatus,
      addRegistration,
      cancelRegistration,
      confirmRegistration,
      updateRegistrationBadges,
      moveFromWaitlist,
      saveTournamentResults,
      importTournamentResults,
      updateResult,
      deleteResult,
      createSeries,
      updateSeries,
      activateSeries,
      deleteSeries,
      setUserPrepay,
      setUserStatus,
      updateUserLogin,
      createManualUser,
      createAdjustment,
      deleteAdjustment,
      createStatus,
      updateStatus,
      deleteStatus,
      createAchievement,
      updateAchievement,
      deleteAchievement,
      awardAchievement,
      revokeAchievement,
      createBroadcast,
      updateBroadcast,
      deleteBroadcast,
      sendBroadcast,
      resetData,
    ],
  )

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}
