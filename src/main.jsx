import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './services/msalInstance'
import { AppProvider } from './context/AppContext.jsx'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ErrorBoundary } from './ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <AuthProvider>
          <NotificationProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </NotificationProvider>
        </AuthProvider>
      </MsalProvider>
    </ErrorBoundary>
  </StrictMode>,
)

