export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
export type RegistrationStatus = 'registered' | 'waitlist' | 'cancelled'
export type BroadcastStatus = 'draft' | 'sending' | 'sent' | 'failed'
export type BroadcastTargetFilter = 'all' | 'registered' | 'series' | 'users'

export type AdminStatus = {
  id: number
  name: string
  slug: string
  description: string | null
  activeImageUrl: string | null
  inactiveImageUrl: string | null
  perkDescription: string | null
  requirements: string
  isManualOnly: boolean
  sortOrder: number
  createdAt: string
}

export type Achievement = {
  id: number
  name: string
  slug: string
  description: string | null
  category: string | null
  iconUrl: string | null
  inactiveIconUrl: string | null
  sortOrder: number
  createdAt: string
}

export type ClubSeries = {
  id: number
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

export type Tournament = {
  id: number
  seriesId: number | null
  medalId: number | null
  name: string
  description: string
  format: string
  imageUrl: string | null
  address: string
  locationHint: string
  date: string
  lateRegistrationEndsAt: string | null
  maxPlayers: number
  prizeInfo: string
  isSignificant: boolean
  status: TournamentStatus
  createdAt: string
}

export type ClubUser = {
  id: number
  login: string
  telegramUsername: string | null
  name: string
  statusId: number | null
  isPrepayRequired: boolean
  isPrepayExempt: boolean
  isOnboarded: boolean
  createdAt: string
}

export type TournamentRegistration = {
  id: number
  userId: number
  tournamentId: number
  registrationNumber: number
  status: RegistrationStatus
  hasTopRatingBadge: boolean
  hasPreviousWinnerBadge: boolean
  confirmedAt: string | null
  cancelledAt: string | null
  createdAt: string
}

export type TournamentResult = {
  id: number
  userId: number
  tournamentId: number
  place: number
  isItm: boolean
  points: number
  bounty: number
  createdAt: string
}

export type PointAdjustment = {
  id: number
  userId: number
  seriesId: number
  points: number
  bounty: number
  reason: string
  createdAt: string
}

export type UserAchievement = {
  id: number
  userId: number
  achievementId: number
  awardedAt: string
}

export type Broadcast = {
  id: number
  message: string
  targetFilter: BroadcastTargetFilter
  targetUserIds: number[]
  targetSeriesId: number | null
  targetTournamentId: number | null
  sentCount: number
  status: BroadcastStatus
  sentAt: string | null
  createdAt: string
}

export type TournamentResultInput = {
  userId: number
  place: number
  isItm?: boolean
  points: number
  bounty: number
}

export type CreateTournamentInput = {
  name: string
  description: string
  format: string
  address: string
  locationHint: string
  date: string
  lateRegistrationEndsAt: string | null
  maxPlayers: number
  seriesId: number | null
  medalId: number | null
  imageUrl: string | null
  isSignificant: boolean
  prizeInfo: string
}

export type UpdateTournamentInput = Partial<CreateTournamentInput> & {
  status?: TournamentStatus
}

export type FinalizeTournamentInput = {
  seriesId: number
  results: TournamentResultInput[]
}

export type CreateSeriesInput = {
  name: string
  startDate: string
  endDate: string
}

export type CreateAdjustmentInput = {
  userId: number
  seriesId: number
  points: number
  bounty: number
  reason: string
}

export type CreateStatusInput = {
  name: string
  slug: string
  description: string | null
  activeImageUrl: string | null
  inactiveImageUrl: string | null
  perkDescription: string | null
  requirements: string
  isManualOnly: boolean
  sortOrder: number
}

export type CreateAchievementInput = {
  name: string
  slug: string
  description: string | null
  category: string | null
  iconUrl: string | null
  inactiveIconUrl: string | null
  sortOrder: number
}

export type CreateBroadcastInput = {
  message: string
  targetFilter: BroadcastTargetFilter
  targetUserIds: number[] | null
  targetSeriesId: number | null
  targetTournamentId: number | null
}

export type DashboardStats = {
  usersCount: number
  tournamentsCount: number
  registrationsInLast7Days: number
}

export type SeriesRatingRow = {
  userId: number
  login: string
  totalPoints: number
  totalBounty: number
  rank: number
}

export type AdminDataState = {
  statuses: AdminStatus[]
  achievements: Achievement[]
  series: ClubSeries[]
  tournaments: Tournament[]
  users: ClubUser[]
  registrations: TournamentRegistration[]
  results: TournamentResult[]
  adjustments: PointAdjustment[]
  userAchievements: UserAchievement[]
  broadcasts: Broadcast[]
}
