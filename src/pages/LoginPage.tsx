import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { FormField } from '../components/FormField'
import { trpc } from '../lib/trpc'

export function LoginPage() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const meQuery = trpc.adminAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (meQuery.data) {
      navigate('/', { replace: true })
    }
  }, [meQuery.data, navigate])

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: async () => {
      await utils.invalidate()
      await meQuery.refetch()
      navigate('/', { replace: true })
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'Ошибка авторизации')
    },
  })

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg-canvas)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--accent)]">OverBet</p>
        <h1 className="mt-1 font-['Space_Grotesk'] text-3xl font-bold text-[var(--text-primary)]">Вход в CRM</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Используй админский email и пароль.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            setErrorMessage('')
            loginMutation.mutate({ email, password })
          }}
        >
          <FormField
            label="Email"
            inputProps={{
              type: 'email',
              value: email,
              onChange: (event) => setEmail(event.target.value),
              required: true,
              autoComplete: 'email',
              placeholder: 'admin@overbet.ru',
            }}
          />

          <FormField
            label="Пароль"
            inputProps={{
              type: 'password',
              value: password,
              onChange: (event) => setPassword(event.target.value),
              required: true,
              autoComplete: 'current-password',
            }}
          />

          {errorMessage ? <p className="text-sm text-[var(--danger)]">{errorMessage}</p> : null}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loginMutation.isPending ? 'Входим...' : 'Войти'}
          </button>
        </form>

        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Бэкенд: <code className="rounded bg-gray-100 px-1 py-0.5">{import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}</code>
        </p>
      </div>
    </div>
  )
}
