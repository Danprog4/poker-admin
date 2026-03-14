import type { ReactNode } from 'react'

type DataColumn<T> = {
  header: string
  className?: string
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  columns: DataColumn<T>[]
  rows: T[]
  getRowKey: (row: T, index: number) => string | number
  emptyLabel?: string
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyLabel = 'Нет данных',
}: DataTableProps<T>) {
  return (
    <div className="w-full max-w-full overflow-x-auto rounded-xl border border-[var(--line)] bg-white shadow-sm">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--line)] bg-gray-50/80">
            {columns.map((column, index) => (
              <th
                key={`${column.header}-${index}`}
                className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-4 py-10 text-center text-sm text-[var(--text-muted)]"
                colSpan={columns.length}
              >
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className="border-b border-[var(--line)] transition-colors last:border-b-0 hover:bg-gray-50/50"
              >
                {columns.map((column, columnIndex) => (
                  <td
                    key={`${column.header}-${columnIndex}`}
                    className={`px-4 py-3 text-sm text-[var(--text-primary)] ${column.className ?? ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
