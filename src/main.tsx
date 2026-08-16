import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import AppShell from './components/AppShell'
import './styles/global.css'
// Applies the persisted/OS theme to <html data-theme> before first paint.
import './store/useThemeStore'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <AppShell>
        <App />
      </AppShell>
    </HashRouter>
  </React.StrictMode>
)
