import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { AuthProvider } from './lib/AuthContext'
import ScrollToTop from './components/ScrollToTop'

// Eager load Landing for fast initial paint
import Landing from './pages/Landing'

// Lazy load other routes
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PathGenerator = lazy(() => import('./pages/PathGenerator'))
const Assessment = lazy(() => import('./pages/Assessment'))
const Sandbox = lazy(() => import('./pages/Sandbox'))
const Chat = lazy(() => import('./pages/Chat'))

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', width: '100%', color: 'var(--text-secondary)' }}>
    Loading...
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <div className="app-container">
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </div>
    </AuthProvider>
  )
}

export default App
