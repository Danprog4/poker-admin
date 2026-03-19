import type { TournamentDescriptionBlock } from '../lib/tournament-description'

type TournamentPreviewCommon = {
  name: string
  dateLabel: string
  seatsLabel: string
  imageUrl: string | null
}

type TournamentCardPreviewProps = TournamentPreviewCommon

type TournamentDetailPreviewProps = TournamentPreviewCommon & {
  bonusLabel: string
  sections: TournamentDescriptionBlock[]
}

function ChipIcon({
  kind,
}: {
  kind: 'clock' | 'users' | 'sparkles'
}) {
  if (kind === 'clock') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-[11px] w-[11px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }

  if (kind === 'users') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-[11px] w-[11px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3.5" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M14 4.13a3.5 3.5 0 0 1 0 5.74" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[11px] w-[11px]"
      fill="currentColor"
    >
      <path d="m12 2 1.9 4.9L19 9l-5.1 2.1L12 16l-1.9-4.9L5 9l5.1-2.1L12 2Z" />
      <path d="m18 14 1.1 2.9L22 18l-2.9 1.1L18 22l-1.1-2.9L14 18l2.9-1.1L18 14Z" />
    </svg>
  )
}

export function TournamentCardPreview({
  name,
  dateLabel,
  seatsLabel,
  imageUrl,
}: TournamentCardPreviewProps) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-3">
      <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
        Превью карточки на главной
      </p>
      <div className="mx-auto w-full max-w-[430px]">
        <div className="relative block min-h-[158px] overflow-hidden rounded-[16px] border border-white/8 bg-[#121318] no-underline">
          <img
            src="/images/main/touranment-bg.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-transparent" />

          <div className="relative z-10 flex h-full min-h-[158px]">
            <div className="flex flex-1 flex-col justify-between p-4">
              <div>
                <h3 className="mb-2 text-[18px] font-semibold leading-[1.1] tracking-[-0.01em] text-white">
                  {name || 'Название турнира'}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-[#2f2f34]/80 px-3 text-[13px] font-medium text-white">
                    <ChipIcon kind="clock" />
                    {dateLabel}
                  </span>
                  <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-[#2f2f34]/80 px-3 text-[13px] font-medium text-white">
                    <ChipIcon kind="users" />
                    {seatsLabel}
                  </span>
                </div>
              </div>

              <span className="mt-2 inline-flex h-[38px] w-fit items-center justify-center rounded-full bg-white px-5 text-[14px] font-semibold text-black">
                Подробнее
              </span>
            </div>

            <div className="w-[150px] shrink-0" />
          </div>

          <img
            src={imageUrl ?? '/images/main/tournament-img.png'}
            alt=""
            className="absolute bottom-[-28px] right-[-10px] z-10 h-auto w-[156px] object-contain"
          />
        </div>
      </div>
    </div>
  )
}

export function TournamentDetailPreview({
  name,
  dateLabel,
  seatsLabel,
  bonusLabel,
  imageUrl,
  sections,
}: TournamentDetailPreviewProps) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-3">
      <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
        Превью страницы турнира в приложении
      </p>
      <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[16px] bg-[#08090b] pb-4">
        <section className="relative overflow-hidden">
          <div className="relative h-[218px]">
            <img
              src="/images/main/touranment-bg.png"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/55 to-[#08090b]" />
            <img
              src={imageUrl ?? '/images/main/tournament-img.png'}
              alt=""
              className="absolute bottom-[-22px] right-[-26px] w-[164px] object-contain"
            />

            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="mb-2 text-[40px] font-semibold leading-[0.9] tracking-[-0.02em] text-white">
                {name || 'Название турнира'}
              </h3>
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/16 px-2.5 text-[11px] font-medium text-white">
                  <ChipIcon kind="clock" />
                  {dateLabel}
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/16 px-2.5 text-[11px] font-medium text-white">
                  <ChipIcon kind="users" />
                  {seatsLabel}
                </span>
              </div>
              {bonusLabel ? (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/16 px-2.5 text-[11px] font-medium text-white">
                  <ChipIcon kind="sparkles" />
                  {bonusLabel}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <div className="px-4 pt-2">
          <div className="flex rounded-[8px] bg-[#111216] p-1">
            <button
              type="button"
              className="h-7 flex-1 rounded-[6px] bg-[#1a1b20] text-[12px] font-medium text-white"
            >
              О турнире
            </button>
            <button
              type="button"
              className="h-7 flex-1 rounded-[6px] text-[12px] font-medium text-white/55"
            >
              Участники {seatsLabel}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-4 pt-3">
          {(sections.length > 0 ? sections : []).slice(0, 3).map((section) => (
            <section
              key={section.id}
              className="rounded-[12px] border border-white/8 bg-[#0c0d10] px-3.5 py-3"
            >
              <h4 className="mb-2 text-[28px] font-semibold leading-[0.92] tracking-[-0.01em] text-white">
                {section.title || 'Заголовок блока'}
              </h4>
              <ul className="space-y-1.5">
                {section.items.filter(Boolean).map((item) => (
                  <li key={item} className="text-[13px] leading-[1.32] text-white/76">
                    · {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="px-4 pb-4 pt-4">
          <button
            type="button"
            className="h-[48px] w-full rounded-[12px] text-[18px] font-semibold text-[#121213]"
            style={{
              background:
                'radial-gradient(63.69% 69.91% at 50% 100%, rgba(237, 86, 21, 0.25) 0%, rgba(237, 21, 114, 0.03) 100%), linear-gradient(180deg, #FBCA2A 61.06%, #F3A02B 100%)',
            }}
          >
            Записаться
          </button>
        </div>
      </div>
    </div>
  )
}
