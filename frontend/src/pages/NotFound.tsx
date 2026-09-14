import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-text mb-4">404</h1>
        <p className="text-xl text-text-muted mb-8">Page not found</p>
        <Link
          to="/"
          className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
