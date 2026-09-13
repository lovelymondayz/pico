import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const location = useLocation()

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-bg">
      <nav className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-primary">Pico</Link>
              {isAuthenticated && (
                <div className="hidden sm:flex sm:ml-8 space-x-4">
                  <Link
                    to="/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/dashboard') ? 'bg-primary-subtle text-primary' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/events"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/events') ? 'bg-primary-subtle text-primary' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    Events
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive('/admin') ? 'bg-primary-subtle text-primary' : 'text-text-muted hover:text-text'
                      }`}
                    >
                      Admin
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="hidden sm:inline text-sm text-text-muted">{user?.name}</span>
                  <span className="hidden sm:inline px-2 py-1 text-xs rounded-full bg-primary-subtle text-primary">
                    {user?.role}
                  </span>
                  <button
                    onClick={logout}
                    className="text-sm text-text-muted hover:text-text"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
