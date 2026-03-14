import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="rounded-xl border border-[var(--line)] bg-white p-6 text-center">
        <p className="text-sm uppercase tracking-[0.12em] text-[var(--text-muted)]">404</p>
        <h1 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold">Страница не найдена</h1>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]">
          Вернуться в дашборд
        </Link>
      </div>
    </div>
  )
}
