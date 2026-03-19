const pad = (value: number) => String(value).padStart(2, '0')

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

export const formatDateTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export const formatDateInput = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return ''
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const formatDateTimeInput = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return ''
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const dateInputToIso = (value: string) => {
  const parts = parseDateParts(value)

  if (!parts) {
    return new Date(value).toISOString()
  }

  return new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0).toISOString()
}

export const dateTimeInputToIso = (value: string) => {
  const parts = parseDateTimeParts(value)

  if (!parts) {
    return new Date(value).toISOString()
  }

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hours,
    parts.minutes,
    0,
    0,
  ).toISOString()
}
