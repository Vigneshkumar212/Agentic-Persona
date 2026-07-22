import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAppStore } from '@renderer/store/useAppStore'
import SetupScreen from '@renderer/routes/Setup/SetupScreen'
import HomeScreen from '@renderer/routes/Home/HomeScreen'
import SettingsScreen from '@renderer/routes/Settings/SettingsScreen'
import ProjectDetailScreen from '@renderer/routes/Project/ProjectDetailScreen'
import ProjectWizardScreen from '@renderer/routes/Project/ProjectWizardScreen'

export default function App(): JSX.Element {
  const { apiKeyStatus, loading, refreshApiKeyStatus } = useAppStore()

  useEffect(() => {
    refreshApiKeyStatus()
  }, [refreshApiKeyStatus])

  if (loading) {
    return (
      <div className="screen screen-centered">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  const hasKey = apiKeyStatus?.hasKey ?? false

  return (
    <Routes>
      <Route path="/setup" element={<SetupScreen />} />
      <Route path="/" element={hasKey ? <HomeScreen /> : <Navigate to="/setup" replace />} />
      <Route
        path="/settings"
        element={hasKey ? <SettingsScreen /> : <Navigate to="/setup" replace />}
      />
      <Route
        path="/project/new"
        element={hasKey ? <ProjectWizardScreen /> : <Navigate to="/setup" replace />}
      />
      <Route
        path="/project/:projectId"
        element={hasKey ? <ProjectDetailScreen /> : <Navigate to="/setup" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
