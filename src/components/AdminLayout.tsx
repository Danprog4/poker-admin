import { useEffect, useState, type PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'

import type { AdminSession } from '../lib/types'
import { clearAdminToken } from '../lib/admin-auth'
import { trpc } from '../lib/trpc'
import { Sidebar } from './Sidebar'

type AdminLayoutProps = PropsWithChildren<{
  admin: AdminSession
}>

export function AdminLayout({ admin, children }: AdminLayoutProps) {
  const utils = trpc.useUtils()
  const location = useLocation()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileSidebarOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileSidebarOpen])

  const resetAuthState = () => {
    clearAdminToken()
    utils.adminAuth.me.setData(undefined, undefined)
    utils.admin.bootstrap.setData(undefined, undefined)
    window.location.replace('/login')
  }

  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: async () => {
      resetAuthState()
    },
    onError: () => {
      resetAuthState()
    },
  })

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 border-r border-gray-800 md:flex">
        <Sidebar className="w-full" />
      </aside>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/45 md:hidden" onClick={closeMobileSidebar} aria-hidden="true" />
      ) : null}

      <div
        id="admin-mobile-sidebar"
        className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[calc(100vw-32px)] transform border-l border-gray-800 bg-[var(--bg-sidebar)] shadow-[0_16px_40px_rgba(15,23,42,0.24)] transition-transform duration-200 md:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!mobileSidebarOpen}
      >
        <Sidebar className="w-full" onNavigate={closeMobileSidebar} />
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 px-4 py-3 backdrop-blur-sm md:px-5">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Админка</p>
              <p className="truncate text-xs text-[var(--text-muted)] md:text-sm">{admin.name ?? admin.email}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-gray-50 hover:text-[var(--text-primary)]"
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? 'Выход...' : 'Выйти'}
              </button>

              <button
                type="button"
                onClick={() => setMobileSidebarOpen((open) => !open)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-[var(--text-primary)] transition hover:bg-gray-50 md:hidden"
                aria-label={mobileSidebarOpen ? 'Закрыть меню' : 'Открыть меню'}
                aria-expanded={mobileSidebarOpen}
                aria-controls="admin-mobile-sidebar"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  {mobileSidebarOpen ? (
                    <>
                      <path d="M6 6L18 18" />
                      <path d="M18 6L6 18" />
                    </>
                  ) : (
                    <>
                      <path d="M4 7H20" />
                      <path d="M8 12H20" />
                      <path d="M11 17H20" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-clip px-4 py-5 md:px-5 md:py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
