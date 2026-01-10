import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { InstallPrompt } from './components/InstallPrompt'
import { BottomTabNav } from './components/BottomTabNav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Foundry from './pages/Foundry'
import Identity from './pages/Identity'
import Treasury from './pages/Treasury'
import CreditCore from './pages/CreditCore'
import Control from './pages/Control'
import Command from './pages/Command'
import TheVault from './pages/TheVault'
import Calendar from './pages/Calendar'
import AdminDashboard from './pages/AdminDashboard'
import Cards from './pages/Cards'
import VaultPage from './pages/VaultPage'
import More from './pages/More'
import Disputes from './pages/Disputes'  // NEW: Disputes page
import './App.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp()
  if (!isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { isAuthenticated } = useApp()

  return (
    <>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/foundry" element={<ProtectedRoute><Foundry /></ProtectedRoute>} />
        <Route path="/identity" element={<ProtectedRoute><Identity /></ProtectedRoute>} />
        <Route path="/treasury" element={<ProtectedRoute><Treasury /></ProtectedRoute>} />
        <Route path="/credit-core" element={<ProtectedRoute><CreditCore /></ProtectedRoute>} />
        <Route path="/control" element={<ProtectedRoute><Control /></ProtectedRoute>} />
        <Route path="/command" element={<ProtectedRoute><Command /></ProtectedRoute>} />
        <Route path="/the-vault" element={<ProtectedRoute><TheVault /></ProtectedRoute>} />
        <Route path="/cards" element={<ProtectedRoute><Cards /></ProtectedRoute>} />
        <Route path="/vault" element={<ProtectedRoute><VaultPage /></ProtectedRoute>} />
        <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/disputes" element={<ProtectedRoute><Disputes /></ProtectedRoute>} />  {/* NEW */}
      </Routes>
      {isAuthenticated && <BottomTabNav />}
      <InstallPrompt />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
