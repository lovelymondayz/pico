import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBusinessEvents, businessStats, generateQR, deleteEvent, closeEvent } from '../services/api'
import { useAuthStore } from '../stores/auth'

interface Event {
  id: number
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
  const [qrEvent, setQrEvent] = useState<number | null>(null)
  const { user, business } = useAuthStore()

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

  const handleQR = async (id: number) => {
    setQrEvent(id)
    try {
      const res = await generateQR(id)
      if (res.qr_url) {
        window.open(res.qr_url, '_blank')
      }
    } catch {
      // Silently fail
    }
    setQrEvent(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to close this event? This cannot be undone.')) return
    try {
      await closeEvent(id)
      setEvents(events.filter(e => e.id !== id))
    } catch (err: any) {
      alert(err.message || 'Failed to close event')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>

  if (error) return <div className="max-w-2xl mx-auto"><div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div></div>

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}</p>
        </div>
        <Link to="/events/new" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          + New Event
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Events</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.total_events ?? events.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Active Events</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{stats?.active_events ?? events.filter(e => e.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Photos</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.total_photos ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Remaining Quota</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.remaining_photos ?? '—'}</p>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Events</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {events.map((event) => (
            <div key={event.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <Link to={`/events/${event.id}`} className="font-medium text-gray-900 hover:text-purple-600 truncate block">
                  {event.name}
                </Link>
                <p className="text-sm text-gray-500">{event.photo_count || 0} photos · Created {new Date(event.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 text-xs rounded-full ${event.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {event.status}
                </span>
                <button
                  onClick={() => handleQR(event.id)}
                  disabled={qrEvent === event.id}
                  className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-md disabled:opacity-50"
                >
                  {qrEvent === event.id ? '...' : 'QR'}
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No events yet. Create your first event!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
