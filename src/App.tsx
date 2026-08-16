import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAppStore } from '@renderer/store/useAppStore'
import WelcomeScreen from '@renderer/routes/Welcome/WelcomeScreen'
import SetupScreen from '@renderer/routes/Setup/SetupScreen'
import HomeScreen from '@renderer/routes/Home/HomeScreen'
import SettingsScreen from '@renderer/routes/Settings/SettingsScreen'
import ProjectDetailScreen from '@renderer/routes/Project/ProjectDetailScreen'
import ProjectWizardScreen from '@renderer/routes/Project/ProjectWizardScreen'
import TrialWizardScreen from '@renderer/routes/Trial/TrialWizardScreen'
import TrialWorkspaceScreen from '@renderer/routes/Trial/TrialWorkspaceScreen'

export default function App(): JSX.Element {
  const { hasCompletedWelcome, hasAnyKey, loading, refresh } = useAppStore()

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loading) {
    return (
      <div className="screen screen-centered">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (!hasCompletedWelcome) {
    return (
      <Routes>
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    )
  }

  if (!hasAnyKey) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupScreen />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="/project/new" element={<ProjectWizardScreen />} />
      <Route path="/project/:projectId" element={<ProjectDetailScreen />} />
      <Route path="/project/:projectId/trial/new" element={<TrialWizardScreen />} />
      <Route path="/project/:projectId/trial/:trialId" element={<TrialWorkspaceScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
