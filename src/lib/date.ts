const pad = (value: number) => String(value).padStart(2, '0')
const MOSCOW_TIME_ZONE = 'Europe/Moscow'
const MOSCOW_UTC_OFFSET_HOURS = 3

const moscowDateTimePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MOSCOW_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const moscowDateTimeLabelFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MOSCOW_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const moscowTimeLabelFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MOSCOW_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const moscowDateLabelFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MOSCOW_TIME_ZONE,
  day: 'numeric',
  month: 'short',
})

const parseDateParts = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  return { year, month, day }
}

const parseDateTimeParts = (value: string) => {
  const [datePart, timePart] = value.split('T')

  if (!datePart || !timePart) {
    return null
  }

  const date = parseDateParts(datePart)
  const [hours, minutes] = timePart.split(':').map(Number)

  if (!date || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  return {
    ...date,
    hours,
    minutes,
  }
}

const getMoscowDateTimeParts = (value: Date) => {
  const parts = moscowDateTimePartsFormatter.formatToParts(value)
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hours: Number(map.hour),
    minutes: Number(map.minute),
  }
}

const buildMoscowDate = (
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
) =>
  new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hours - MOSCOW_UTC_OFFSET_HOURS,
      minutes,
      0,
      0,
    ),
  )

export const formatDateTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: MOSCOW_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export const formatDateInput = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return ''
  }

  const parts = getMoscowDateTimeParts(date)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export const formatDateTimeInput = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return ''
  }

  const parts = getMoscowDateTimeParts(date)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hours)}:${pad(parts.minutes)}`
}

export const dateInputToIso = (value: string) => {
  const parts = parseDateParts(value)

  if (!parts) {
    return new Date(value).toISOString()
  }

  return buildMoscowDate(parts.year, parts.month, parts.day).toISOString()
}

export const dateTimeInputToIso = (value: string) => {
  const parts = parseDateTimeParts(value)

  if (!parts) {
    return new Date(value).toISOString()
  }

  return buildMoscowDate(
    parts.year,
    parts.month,
    parts.day,
    parts.hours,
    parts.minutes,
  ).toISOString()
}

export const formatDateTimeInputLabel = (value: string) => {
  const parts = parseDateTimeParts(value)

  if (!parts) {
    const date = new Date(value)

    if (Number.isNaN(date.valueOf())) {
      return value
    }

    return moscowDateTimeLabelFormatter.format(date)
  }

  return moscowDateTimeLabelFormatter.format(
    buildMoscowDate(parts.year, parts.month, parts.day, parts.hours, parts.minutes),
  )
}

export const formatDateLabel = (value: string) => {
  const parts = parseDateParts(value)

  if (!parts) {
    const date = new Date(value)

    if (Number.isNaN(date.valueOf())) {
      return value
    }

    return moscowDateLabelFormatter.format(date)
  }

  return moscowDateLabelFormatter.format(
    buildMoscowDate(parts.year, parts.month, parts.day),
  )
}

export const formatTimeLabel = (value: string) => {
  const parts = parseDateTimeParts(value)

  if (!parts) {
    const date = new Date(value)

    if (Number.isNaN(date.valueOf())) {
      return value
    }

    return moscowTimeLabelFormatter.format(date)
  }

  return moscowTimeLabelFormatter.format(
    buildMoscowDate(parts.year, parts.month, parts.day, parts.hours, parts.minutes),
  )
}
