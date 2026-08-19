import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import EventCreate from './pages/EventCreate'
import EventGallery from './pages/EventGallery'
import Admin from './pages/Admin'
import { useAuthStore } from './stores/auth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/e/:slug" element={<EventGallery />} />
        <Route path="/" element={
          <Layout>
            <div className="text-center py-20">
              <h1 className="text-4xl font-bold text-gray-900">Event Photo Sharing</h1>
              <p className="mt-4 text-lg text-gray-600">Collect and share memories from your events</p>
              <div className="mt-8 flex justify-center gap-4">
                <a href="/register" className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">Get Started</a>
                <a href="/login" className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Sign In</a>
              </div>
            </div>
          </Layout>
        } />

        {/* Business */}
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/events/new" element={<ProtectedRoute><Layout><EventCreate /></Layout></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><Layout><Admin /></Layout></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
