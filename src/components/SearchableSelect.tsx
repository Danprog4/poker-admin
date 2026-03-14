import { useEffect, useMemo, useRef, useState } from 'react'

type Option = {
  value: string
  label: string
}

type SearchableSelectProps = {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Поиск...',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = options.find((item) => item.value === value)?.label ?? ''

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter((item) => item.label.toLowerCase().includes(normalized))
  }, [options, query])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-left text-sm transition focus:border-[var(--accent)] focus:ring-2 focus:ring-indigo-100 focus:outline-none"
        >
          <span className={selectedLabel ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
            {selectedLabel || placeholder}
          </span>
          <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </label>

      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--line)] bg-white shadow-lg">
          <div className="border-b border-[var(--line)] p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-md border border-[var(--line)] bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--text-muted)]">Ничего не найдено</li>
            ) : (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                      setQuery('')
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition hover:bg-[var(--accent-soft)] ${
                      option.value === value
                        ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
