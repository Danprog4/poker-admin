import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import './index.css'
import { AppProviders } from './providers/AppProviders'
import { AdminDataProvider } from './providers/AdminDataProvider'
import { ToastProvider } from './providers/ToastProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <ToastProvider>
        <AdminDataProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AdminDataProvider>
      </ToastProvider>
    </AppProviders>
  </StrictMode>,
)
