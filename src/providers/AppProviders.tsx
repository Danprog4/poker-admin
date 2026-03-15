import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'

import { getAdminToken } from '../lib/admin-auth'
import { apiUrl } from '../lib/config'
import { trpc } from '../lib/trpc'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: `${apiUrl}/api/trpc`,
          fetch(url, options) {
            const headers = new Headers(options?.headers)
            const adminToken = getAdminToken()

            if (adminToken) {
              headers.set('Authorization', `Bearer ${adminToken}`)
            }

            return fetch(url, {
              ...options,
              credentials: 'include',
              headers,
            })
          },
        }),
      ],
    }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
