type StatCardProps = {
  title: string
  value: string
  description: string
}

export function StatCard({ title, value, description }: StatCardProps) {
  return (
    <article className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{title}</p>
      <p className="mt-2 font-['Space_Grotesk'] text-3xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">{description}</p>
    </article>
  )
}
