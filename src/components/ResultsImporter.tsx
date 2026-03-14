import { useMemo, useState } from 'react'

type ResultsImporterProps = {
  onSave: (nicknames: string[]) => void
  pending?: boolean
}

export function ResultsImporter({ onSave, pending = false }: ResultsImporterProps) {
  const [rawText, setRawText] = useState('')

  const nicknames = useMemo(
    () =>
      rawText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    [rawText],
  )

  return (
    <section className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Импорт результатов</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Вставь список ников: 1 строка = 1 игрок. Места назначаются от 1 до N.
        </p>
      </div>

      <textarea
        value={rawText}
        onChange={(event) => setRawText(event.target.value)}
        className="min-h-36 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-indigo-100"
        placeholder="nick_1&#10;nick_2&#10;nick_3"
      />

      <div className="rounded-lg border border-[var(--line)] bg-gray-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Превью</p>
        <ul className="mt-2 space-y-1 text-sm text-[var(--text-primary)]">
          {nicknames.length === 0 ? <li className="text-[var(--text-muted)]">Список пуст</li> : null}
          {nicknames.map((nickname, index) => (
            <li key={`${nickname}-${index}`}>
              <span className="text-[var(--text-muted)]">{index + 1}.</span> {nickname}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => onSave(nicknames)}
        disabled={nicknames.length === 0 || pending}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Импортируем...' : 'Сохранить результаты'}
      </button>
    </section>
  )
}
