import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBusinessEvents, businessStats, closeEvent } from '../services/api'
import { useAuthStore } from '../stores/auth'

interface Event {
  id: string
  name: string
  slug: string
  photo_count?: number
  status: string
  created_at: string
  total_photo_limit: number
  guest_photo_limit: number
}

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuthStore()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [eventsRes, statsRes] = await Promise.all([
        getBusinessEvents(),
        businessStats(),
      ])
      setEvents(eventsRes.events || [])
      setStats(statsRes?.stats || null)
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = async (id: string) => {
    if (!confirm('Are you sure you want to close this event? This cannot be undone.')) return
    try {
      await closeEvent(id)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to close event')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  if (error) return <div className="max-w-2xl mx-auto"><div className="p-4 bg-danger-subtle border border-danger rounded-lg text-danger">{error}</div></div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="text-text-muted">Welcome back, {user?.name}</p>
        </div>
        <Link to="/events/new" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
          + New Event
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-border p-6">
          <p className="text-sm font-medium text-text-muted">Total Events</p>
          <p className="mt-2 text-3xl font-bold text-text">{stats?.total_events ?? events.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6">
          <p className="text-sm font-medium text-text-muted">Active Events</p>
          <p className="mt-2 text-3xl font-bold text-primary">{stats?.active_events ?? events.filter(e => e.status === 'active').length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6">
          <p className="text-sm font-medium text-text-muted">Total Photos</p>
          <p className="mt-2 text-3xl font-bold text-text">{stats?.total_photos ?? 0}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6">
          <p className="text-sm font-medium text-text-muted">Remaining Quota</p>
          <p className="mt-2 text-3xl font-bold text-text">{stats?.remaining_photos ?? '—'}</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">Your Events</h2>
        </div>
        <div className="divide-y divide-border">
          {events.map((event) => (
            <div key={event.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-surface-alt">
              <div className="flex-1 min-w-0">
                <Link to={`/events/${event.id}`} className="font-medium text-text hover:text-primary truncate block">
                  {event.name}
                </Link>
                <p className="text-sm text-text-muted">{event.photo_count || 0} photos · Created {new Date(event.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 text-xs rounded-full ${event.status === 'active' ? 'bg-success-subtle text-success' : 'bg-surface-alt text-text-muted'}`}>
                  {event.status}
                </span>
                <button
                  onClick={() => handleClose(event.id)}
                  className="px-3 py-1 text-sm text-danger hover:bg-danger-subtle rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-text-muted">No events yet. Create your first event!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
