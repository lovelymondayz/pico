import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ToastContainer from './components/Toast'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import EventCreate from './pages/EventCreate'
import EventDetail from './pages/EventDetail'
import EventGallery from './pages/EventGallery'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import Home from './pages/Home'
import { useAuthStore } from './stores/auth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Home />} />

        {/* Auth - redirect to dashboard if already logged in */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

        {/* Event gallery (public) */}
        <Route path="/e/:slug" element={<EventGallery />} />

        {/* Business routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/events" element={<Navigate to="/dashboard" replace />} />
        <Route path="/events/new" element={<ProtectedRoute><Layout><EventCreate /></Layout></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><Layout><EventDetail /></Layout></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><Layout><Admin /></Layout></AdminRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
