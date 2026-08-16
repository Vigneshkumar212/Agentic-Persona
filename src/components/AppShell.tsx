import type { ReactNode } from 'react'
import ThemeToggle from '@renderer/components/ThemeToggle'

export default function AppShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="app-topbar-title">Agentic Persona</span>
        <ThemeToggle />
      </header>
      <div className="app-body">{children}</div>
    </div>
  )
}
