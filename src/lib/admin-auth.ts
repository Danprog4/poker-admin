const ADMIN_AUTH_TOKEN_KEY = 'overbet_admin_token'

export const getAdminToken = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(ADMIN_AUTH_TOKEN_KEY)
}

export const setAdminToken = (token: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, token)
}

export const clearAdminToken = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY)
}
