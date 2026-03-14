import type { PropsWithChildren } from 'react'

import type { AdminSession } from '../lib/types'
import { trpc } from '../lib/trpc'
import { Sidebar } from './Sidebar'

type AdminLayoutProps = PropsWithChildren<{
  admin: AdminSession
}>

export function AdminLayout({ admin, children }: AdminLayoutProps) {
  const utils = trpc.useUtils()

  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: async () => {
      utils.adminAuth.me.setData(undefined, undefined)
      utils.admin.bootstrap.setData(undefined, undefined)
      window.location.replace('/login')
    },
  })

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-white/95 px-5 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)]">Админка</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{admin.name ?? admin.email}</p>
            </div>

            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-gray-50 hover:text-[var(--text-primary)]"
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? 'Выход...' : 'Выйти'}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-clip px-5 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
