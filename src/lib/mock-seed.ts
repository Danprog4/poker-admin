import type { AdminDataState } from './admin-models'

const nowIso = new Date().toISOString()

export const initialAdminData: AdminDataState = {
  statuses: [
    {
      id: 1,
      name: 'Новичок',
      slug: 'newbie',
      description: 'Новый игрок клуба',
      activeImageUrl: null,
      inactiveImageUrl: null,
      perkDescription: null,
      requirements: '{}',
      isManualOnly: false,
      sortOrder: 0,
      createdAt: nowIso,
    },
    {
      id: 2,
      name: 'Резидент',
      slug: 'resident',
      description: 'Постоянный участник турниров',
      activeImageUrl: null,
      inactiveImageUrl: null,
      perkDescription: null,
      requirements: '{}',
      isManualOnly: false,
      sortOrder: 1,
      createdAt: nowIso,
    },
    {
      id: 3,
      name: 'Легенда',
      slug: 'legend',
      description: 'Подтверждается вручную админом',
      activeImageUrl: null,
      inactiveImageUrl: null,
      perkDescription: null,
      requirements: '{}',
      isManualOnly: true,
      sortOrder: 2,
      createdAt: nowIso,
    },
  ],
  achievements: [
    {
      id: 1,
      name: 'MYSTERY ROYAL',
      slug: 'month-grand-final-1',
      description: 'Победа в турнире MYSTERY ROYAL.',
      category: 'month_grand_final',
      iconUrl: '/images/medals/medal-1.png',
      inactiveIconUrl: '/images/medals/medal-1.png',
      sortOrder: 0,
      createdAt: nowIso,
    },
    {
      id: 2,
      name: 'One Life Tournament',
      slug: 'month-grand-final-2',
      description: 'Победа в турнире One Life Tournament.',
      category: 'month_grand_final',
      iconUrl: '/images/medals/medal-2.png',
      inactiveIconUrl: '/images/medals/medal-2.png',
      sortOrder: 1,
      createdAt: nowIso,
    },
    {
      id: 3,
      name: 'Cascade K.O',
      slug: 'month-grand-final-3',
      description: 'Победа в турнире Cascade K.O.',
      category: 'month_grand_final',
      iconUrl: '/images/medals/medal-3.png',
      inactiveIconUrl: '/images/medals/medal-3.png',
      sortOrder: 2,
      createdAt: nowIso,
    },
    {
      id: 4,
      name: 'Golden Hour K.O',
      slug: 'month-grand-final-4',
      description: 'Победа в турнире Golden Hour K.O.',
      category: 'month_grand_final',
      iconUrl: '/images/medals/medal-4.png',
      inactiveIconUrl: '/images/medals/medal-4.png',
      sortOrder: 3,
      createdAt: nowIso,
    },
    {
      id: 5,
      name: 'Golden Hour K.O',
      slug: 'month-grand-final-5',
      description: 'Победа в турнире Golden Hour K.O.',
      category: 'month_grand_final',
      iconUrl: '/images/medals/medal-5.png',
      inactiveIconUrl: '/images/medals/medal-5.png',
      sortOrder: 4,
      createdAt: nowIso,
    },
    {
      id: 6,
      name: 'SNG Турнир для вылетевших',
      slug: 'month-grand-final-6',
      description: 'Победа в турнире SNG Турнир для вылетевших.',
      category: 'month_grand_final',
      iconUrl: '/images/medals/medal-6.png',
      inactiveIconUrl: '/images/medals/medal-6.png',
      sortOrder: 5,
      createdAt: nowIso,
    },
    {
      id: 7,
      name: 'SNG Турнир для вылетевших',
      slug: 'month-grand-final-7',
      description: 'Победа в турнире SNG Турнир для вылетевших.',
      category: 'month_grand_final',
      iconUrl: '/images/medals/medal-7.png',
      inactiveIconUrl: '/images/medals/medal-7.png',
      sortOrder: 6,
      createdAt: nowIso,
    },
    {
      id: 8,
      name: 'Специальный турнир',
      slug: 'month-grand-final-8',
      description: 'Специальная медаль клуба для отдельного турнирного события.',
      category: 'month_grand_final',
      iconUrl: '/images/medals/medal-8.png',
      inactiveIconUrl: '/images/medals/medal-8.png',
      sortOrder: 7,
      createdAt: nowIso,
    },
  ],
  series: [
    {
      id: 1,
      name: 'Февральская серия',
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-02-28T23:59:59.000Z',
      isActive: true,
      createdAt: nowIso,
    },
    {
      id: 2,
      name: 'Мартовская серия',
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-03-31T23:59:59.000Z',
      isActive: false,
      createdAt: nowIso,
    },
  ],
  tournaments: [
    {
      id: 1,
      seriesId: 1,
      medalId: 1,
      name: 'MYSTERY ROYAL',
      description: `Что будет

· Mystery bounty с динамикой по ходу вечера
· За выбивание игроков начисляются рейтинговые очки
· На поздних стадиях растет ценность каждого нокаута

Дополнительно

· Атмосфера большого вечернего ивента
· Очки в общий рейтинг серии
· После вылета можно перейти в SnG для вылетевших

Детали

· Адрес клуба — Набережная адмиралтейского канала 27, метро Адмиралтейская
· Стоимость участия — 1 000 ₽
· Повторный вход — 1 000 ₽
· Стартовый стек — 300 BB
· Уровни — от 20 до 12 минут
· Поздняя регистрация до 21:50`,
      format: 'NLH Mystery Knockout',
      imageUrl: '/images/new-tournaments/mystery-royal.png',
      address: 'Набережная адмиралтейского канала 27',
      locationHint: 'Вход со двора, второй этаж',
      date: '2026-03-20T19:00:00.000Z',
      maxPlayers: 100,
      prizeInfo: 'Первые 10 → 10 000 к стеку',
      isSignificant: false,
      status: 'upcoming',
      createdAt: '2026-03-15T10:00:00.000Z',
    },
    {
      id: 2,
      seriesId: 1,
      medalId: 2,
      name: 'One Life Tournament',
      description: `Что будет

· Классический freeze-out без повторных входов
· Один шанс на проход в позднюю стадию
· Ровная глубокая структура с акцентом на постфлоп

Дополнительно

· Увеличенный стартовый стек
· Очки в общий рейтинг серии
· Бар и кухня работают для вас весь вечер`,
      format: 'NLH Freezeout',
      imageUrl: '/images/new-tournaments/one-life-tournament.png',
      address: 'Набережная адмиралтейского канала 27',
      locationHint: 'Вход со двора, второй этаж',
      date: '2026-03-22T19:00:00.000Z',
      maxPlayers: 60,
      prizeInfo: 'Первые 5 → 15 000 к стеку',
      isSignificant: false,
      status: 'upcoming',
      createdAt: '2026-03-15T10:10:00.000Z',
    },
    {
      id: 3,
      seriesId: 1,
      medalId: 3,
      name: 'Cascade K.O',
      description: `Что будет

· Каскадный формат нокаутов
· До конца поздней регистрации — 50 очков за голову
· После её завершения — 100 очков за голову
· На финальном столе — 200 очков за голову!`,
      format: 'NLH Knockout',
      imageUrl: '/images/new-tournaments/cascade-ko.png',
      address: 'Набережная адмиралтейского канала 27',
      locationHint: 'Вход со двора, второй этаж',
      date: '2026-03-24T19:00:00.000Z',
      maxPlayers: 100,
      prizeInfo: 'Первые 10 → 10 000 к стеку',
      isSignificant: false,
      status: 'upcoming',
      createdAt: '2026-03-15T10:20:00.000Z',
    },
    {
      id: 4,
      seriesId: 1,
      medalId: 4,
      name: 'Golden Hour K.O',
      description: `Что будет

· Быстрый нокаут-турнир в темпе after work
· Короткие уровни и плотная динамика до финального стола`,
      format: 'NLH Knockout Turbo',
      imageUrl: '/images/new-tournaments/golden-hour-ko-1.png',
      address: 'Набережная адмиралтейского канала 27',
      locationHint: 'Вход со двора, второй этаж',
      date: '2026-03-26T19:00:00.000Z',
      maxPlayers: 100,
      prizeInfo: 'Первым 10 + 10 000 к стеку',
      isSignificant: false,
      status: 'upcoming',
      createdAt: '2026-03-15T10:30:00.000Z',
    },
    {
      id: 5,
      seriesId: 1,
      medalId: 5,
      name: 'Golden Hour K.O',
      description: `Что будет

· Быстрый нокаут-турнир в темпе after work
· Короткие уровни и плотная динамика до финального стола`,
      format: 'NLH Knockout Turbo',
      imageUrl: '/images/new-tournaments/golden-hour-ko-2.png',
      address: 'Набережная адмиралтейского канала 27',
      locationHint: 'Вход со двора, второй этаж',
      date: '2026-03-27T19:00:00.000Z',
      maxPlayers: 100,
      prizeInfo: 'Первым 10 + 10 000 к стеку',
      isSignificant: false,
      status: 'upcoming',
      createdAt: '2026-03-15T10:40:00.000Z',
    },
    {
      id: 6,
      seriesId: 1,
      medalId: 6,
      name: 'SNG Турнир для вылетевших',
      description: `Что будет

· Быстрый SnG для тех, кто выбыл из основного турнира
· Турбо-структура без долгого ожидания`,
      format: 'Sit & Go Turbo',
      imageUrl: '/images/new-tournaments/sng-eliminated-1.png',
      address: 'Набережная адмиралтейского канала 27',
      locationHint: 'Вход со двора, второй этаж',
      date: '2026-03-26T22:20:00.000Z',
      maxPlayers: 18,
      prizeInfo: 'Быстрый бонусный турнир',
      isSignificant: false,
      status: 'upcoming',
      createdAt: '2026-03-15T10:50:00.000Z',
    },
    {
      id: 7,
      seriesId: 1,
      medalId: 7,
      name: 'SNG Турнир для вылетевших',
      description: `Что будет

· Быстрый SnG для тех, кто выбыл из основного турнира
· Турбо-структура без долгого ожидания`,
      format: 'Sit & Go Turbo',
      imageUrl: '/images/new-tournaments/sng-eliminated-2.png',
      address: 'Набережная адмиралтейского канала 27',
      locationHint: 'Вход со двора, второй этаж',
      date: '2026-03-27T22:20:00.000Z',
      maxPlayers: 18,
      prizeInfo: 'Быстрый бонусный турнир',
      isSignificant: false,
      status: 'upcoming',
      createdAt: '2026-03-15T11:00:00.000Z',
    },
  ],
  users: [
    {
      id: 100001,
      login: 'nikita',
      telegramUsername: 'nikita_ovb',
      name: 'Никита',
      statusId: 2,
      isPrepayRequired: false,
      isPrepayExempt: false,
      isOnboarded: true,
      createdAt: '2026-01-10T10:00:00.000Z',
    },
    {
      id: 100002,
      login: 'andrey',
      telegramUsername: 'andrey_ovb',
      name: 'Андрей',
      statusId: 1,
      isPrepayRequired: true,
      isPrepayExempt: false,
      isOnboarded: true,
      createdAt: '2026-01-12T10:00:00.000Z',
    },
    {
      id: 100003,
      login: 'nastya',
      telegramUsername: 'nastya_ovb',
      name: 'Настя',
      statusId: 2,
      isPrepayRequired: false,
      isPrepayExempt: false,
      isOnboarded: true,
      createdAt: '2026-01-18T10:00:00.000Z',
    },
    {
      id: 100004,
      login: 'georgiy',
      telegramUsername: 'georgiy_ovb',
      name: 'Георгий',
      statusId: 3,
      isPrepayRequired: false,
      isPrepayExempt: false,
      isOnboarded: true,
      createdAt: '2026-01-21T10:00:00.000Z',
    },
  ],
  registrations: [
    {
      id: 1,
      userId: 100001,
      tournamentId: 1,
      registrationNumber: 1,
      status: 'registered',
      hasTopRatingBadge: false,
      hasPreviousWinnerBadge: false,
      confirmedAt: '2026-02-25T10:00:00.000Z',
      cancelledAt: null,
      createdAt: '2026-02-25T10:00:00.000Z',
    },
    {
      id: 2,
      userId: 100002,
      tournamentId: 1,
      registrationNumber: 2,
      status: 'waitlist',
      hasTopRatingBadge: false,
      hasPreviousWinnerBadge: false,
      confirmedAt: null,
      cancelledAt: null,
      createdAt: '2026-02-25T10:15:00.000Z',
    },
    {
      id: 3,
      userId: 100003,
      tournamentId: 1,
      registrationNumber: 3,
      status: 'registered',
      hasTopRatingBadge: false,
      hasPreviousWinnerBadge: false,
      confirmedAt: null,
      cancelledAt: null,
      createdAt: '2026-02-25T10:30:00.000Z',
    },
  ],
  results: [
    {
      id: 1,
      userId: 100001,
      tournamentId: 2,
      place: 1,
      isItm: true,
      points: 120,
      bounty: 40,
      createdAt: '2026-02-20T20:00:00.000Z',
    },
    {
      id: 2,
      userId: 100003,
      tournamentId: 2,
      place: 2,
      isItm: true,
      points: 90,
      bounty: 20,
      createdAt: '2026-02-20T20:00:00.000Z',
    },
  ],
  adjustments: [
    {
      id: 1,
      userId: 100001,
      seriesId: 1,
      points: 50,
      bounty: 0,
      reason: 'Бонус за помощь',
      createdAt: '2026-02-14T10:00:00.000Z',
    },
    {
      id: 2,
      userId: 100002,
      seriesId: 1,
      points: -20,
      bounty: 0,
      reason: 'Штраф за неявку',
      createdAt: '2026-02-17T12:00:00.000Z',
    },
  ],
  userAchievements: [
    {
      id: 1,
      userId: 100001,
      achievementId: 1,
      awardedAt: '2026-02-10T12:00:00.000Z',
    },
  ],
  broadcasts: [
    {
      id: 1,
      message: 'Напоминание о турнире сегодня в 20:00',
      targetFilter: 'all',
      targetUserIds: [],
      targetSeriesId: null,
      targetTournamentId: null,
      sentCount: 4,
      status: 'sent',
      sentAt: '2026-02-27T14:00:00.000Z',
      createdAt: '2026-02-27T13:58:00.000Z',
    },
    {
      id: 2,
      message: 'Подтвердите участие и предоплату',
      targetFilter: 'registered',
      targetUserIds: [],
      targetSeriesId: null,
      targetTournamentId: 1,
      sentCount: 0,
      status: 'draft',
      sentAt: null,
      createdAt: '2026-02-28T10:20:00.000Z',
    },
  ],
}
