export type RequirementKey =
  | 'tournaments'
  | 'points'
  | 'wins'
  | 'itmCount'
  | 'itmPercent'
  | 'activeMonths'
  | 'top10Monthly'
  | 'top3Monthly'
  | 'significantWin'
  | 'manualApproval'

export type RequirementState = Record<RequirementKey, string>

export type StatusEditorForm = {
  name: string
  description: string
  activeImageUrl: string
  inactiveImageUrl: string
  perkDescription: string
  isManualOnly: string
  requirements: RequirementState
}

export const STATUS_ASSET_OPTIONS = [
  { value: '/images/statuses/novichok-active.png', label: 'Новичок · активная' },
  { value: '/images/statuses/novichok-inactive.png', label: 'Новичок · неактивная' },
  { value: '/images/statuses/uchastnik-active.png', label: 'Участник · активная' },
  { value: '/images/statuses/uchastnik-inactive.png', label: 'Участник · неактивная' },
  { value: '/images/statuses/rezident-active.png', label: 'Резидент · активная' },
  { value: '/images/statuses/rezident-inactive.png', label: 'Резидент · неактивная' },
  { value: '/images/statuses/shark-active.png', label: 'Shark · активная' },
  { value: '/images/statuses/shark-inactive.png', label: 'Shark · неактивная' },
  { value: '/images/statuses/top-shark-active.png', label: 'Top Shark · активная' },
  { value: '/images/statuses/top-shark-inactive.png', label: 'Top Shark · неактивная' },
  { value: '/images/statuses/elita-active.png', label: 'Элита · активная' },
  { value: '/images/statuses/elita-inactive.png', label: 'Элита · неактивная' },
  { value: '/images/statuses/legenda-active.png', label: 'Легенда · активная' },
  { value: '/images/statuses/legenda-inactive.png', label: 'Легенда · неактивная' },
]

export const REQUIREMENT_FIELDS: Array<{
  key: RequirementKey
  label: string
  type: 'number' | 'boolean'
  placeholder: string
}> = [
  { key: 'tournaments', label: 'Сыграно турниров', type: 'number', placeholder: 'Например, 10' },
  { key: 'points', label: 'Очки', type: 'number', placeholder: 'Например, 2000' },
  { key: 'wins', label: 'Победы', type: 'number', placeholder: 'Например, 2' },
  { key: 'itmCount', label: 'Попадания в ITM', type: 'number', placeholder: 'Например, 5' },
  { key: 'itmPercent', label: 'ITM, %', type: 'number', placeholder: 'Например, 20' },
  { key: 'activeMonths', label: 'Активные месяцы', type: 'number', placeholder: 'Например, 3' },
  { key: 'top10Monthly', label: 'Входил в топ-10 месяца', type: 'boolean', placeholder: '' },
  { key: 'top3Monthly', label: 'Входил в топ-3 месяца', type: 'boolean', placeholder: '' },
  { key: 'significantWin', label: 'Есть значимая победа', type: 'boolean', placeholder: '' },
  { key: 'manualApproval', label: 'Нужно подтверждение админа', type: 'boolean', placeholder: '' },
]

export const EMPTY_REQUIREMENTS: RequirementState = {
  tournaments: '',
  points: '',
  wins: '',
  itmCount: '',
  itmPercent: '',
  activeMonths: '',
  top10Monthly: 'false',
  top3Monthly: 'false',
  significantWin: 'false',
  manualApproval: 'false',
}

export const EMPTY_STATUS_FORM: StatusEditorForm = {
  name: '',
  description: '',
  activeImageUrl: '/images/statuses/novichok-active.png',
  inactiveImageUrl: '/images/statuses/novichok-inactive.png',
  perkDescription: '',
  isManualOnly: 'false',
  requirements: EMPTY_REQUIREMENTS,
}

export const toNullable = (value: string) => {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/[а-яё]/gi, (char) => {
      const map: Record<string, string> = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'e',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'c',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'y',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
      }

      return map[char.toLowerCase()] ?? ''
    })
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

export const parseRequirements = (input: string) => {
  try {
    const parsed = JSON.parse(input) as Record<string, unknown>

    return {
      tournaments: typeof parsed.tournaments === 'number' ? String(parsed.tournaments) : '',
      points: typeof parsed.points === 'number' ? String(parsed.points) : '',
      wins: typeof parsed.wins === 'number' ? String(parsed.wins) : '',
      itmCount: typeof parsed.itmCount === 'number' ? String(parsed.itmCount) : '',
      itmPercent: typeof parsed.itmPercent === 'number' ? String(parsed.itmPercent) : '',
      activeMonths: typeof parsed.activeMonths === 'number' ? String(parsed.activeMonths) : '',
      top10Monthly: parsed.top10Monthly ? 'true' : 'false',
      top3Monthly: parsed.top3Monthly ? 'true' : 'false',
      significantWin: parsed.significantWin ? 'true' : 'false',
      manualApproval: parsed.manualApproval ? 'true' : 'false',
    } satisfies RequirementState
  } catch {
    return EMPTY_REQUIREMENTS
  }
}

export const stringifyRequirements = (requirements: RequirementState) => {
  const payload: Record<string, number | boolean> = {}

  for (const field of REQUIREMENT_FIELDS) {
    const value = requirements[field.key]

    if (field.type === 'number') {
      const parsed = Number(value)

      if (Number.isFinite(parsed) && parsed > 0) {
        payload[field.key] = parsed
      }
      continue
    }

    if (value === 'true') {
      payload[field.key] = field.key === 'top10Monthly' || field.key === 'top3Monthly' ? 1 : true
    }
  }

  return JSON.stringify(payload)
}

export const summarizeRequirements = (requirements: RequirementState) => {
  const labels = REQUIREMENT_FIELDS.flatMap((field) => {
    const value = requirements[field.key]

    if (field.type === 'number') {
      return value.trim() ? `${field.label}: ${value}` : []
    }

    return value === 'true' ? [field.label] : []
  })

  return labels.length > 0 ? labels.join(' · ') : 'Без условий'
}
