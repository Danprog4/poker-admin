const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, '')

export const apiUrl = normalizeBaseUrl(
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
)
