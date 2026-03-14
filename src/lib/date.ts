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

  return date.toISOString().slice(0, 10)
}

export const formatDateTimeInput = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return ''
  }

  return date.toISOString().slice(0, 16)
}
