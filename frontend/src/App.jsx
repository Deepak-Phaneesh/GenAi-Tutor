import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { AuthProvider } from './lib/AuthContext'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import PathGenerator from './pages/PathGenerator'
import Assessment from './pages/Assessment'
import Sandbox from './pages/Sandbox'
import Chat from './pages/Chat'

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes (Wrapped in AppLayout sidebar/nav) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="generate-path" element={<PathGenerator />} />
              <Route path="assessment" element={<Assessment />} />
              <Route path="sandbox" element={<Sandbox />} />
              <Route path="chat" element={<Chat />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
