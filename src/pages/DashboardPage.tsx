import { Link } from 'react-router-dom'

import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../lib/date'
import { useAdminData } from '../providers/useAdminData'

export function DashboardPage() {
  const { state, dashboardStats, activeSeries, getSeriesById } = useAdminData()

  const upcomingTournaments = state.tournaments
    .filter((item) => item.status === 'upcoming')
    .sort((a, b) => new Date(a.date).valueOf() - new Date(b.date).valueOf())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Юзеры"
          value={String(dashboardStats.usersCount)}
          description="Всего зарегистрированных игроков"
        />
        <StatCard
          title="Турниры"
          value={String(dashboardStats.tournamentsCount)}
          description="Всего турниров в системе"
        />
        <StatCard
          title="Записи за 7 дней"
          value={String(dashboardStats.registrationsInLast7Days)}
          description="Новые регистрации на турниры"
        />
      </section>

      <section className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-['Space_Grotesk'] text-xl font-bold">Ближайшие турниры</h2>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Активная серия: {activeSeries?.name ?? 'не выбрана'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/tournaments/new"
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            >
              Новый турнир
            </Link>
            <Link
              to="/series"
              className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-gray-50"
            >
              Серии
            </Link>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {upcomingTournaments.length === 0 ? (
            <li className="rounded-lg border border-dashed border-[var(--line)] p-4 text-sm text-[var(--text-muted)]">
              Нет ближайших турниров
            </li>
          ) : null}

          {upcomingTournaments.map((tournament) => {
            const series = getSeriesById(tournament.seriesId)

            return (
              <li
                key={tournament.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] p-3 transition hover:bg-gray-50/50"
              >
                <div>
                  <Link
                    to={`/tournaments/${tournament.id}`}
                    className="font-semibold text-[var(--accent)] hover:underline"
                  >
                    {tournament.name}
                  </Link>
                  <p className="text-sm text-[var(--text-muted)]">
                    {formatDateTime(tournament.date)} · {series?.name ?? 'Без серии'}
                  </p>
                </div>
                <StatusBadge status={tournament.status} />
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
