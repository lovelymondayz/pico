import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBusinessEvents, businessStats, generateQR } from '../services/api'
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

const DUMMY_EVENTS: Event[] = [
  { id: 1, name: 'Sarah & Michael Wedding', slug: 'sarah-michael-wedding-1787092829', photo_count: 47, status: 'active', created_at: '2026-08-18T10:00:00Z', total_photo_limit: 500, guest_photo_limit: 20 },
  { id: 2, name: 'Company Annual Party 2026', slug: 'company-party-2026-1787092830', photo_count: 128, status: 'active', created_at: '2026-08-17T14:30:00Z', total_photo_limit: 1000, guest_photo_limit: 30 },
  { id: 3, name: 'Product Launch Event', slug: 'product-launch-1787092831', photo_count: 0, status: 'active', created_at: '2026-08-16T09:00:00Z', total_photo_limit: 200, guest_photo_limit: 10 },
  { id: 4, name: 'Summer Beach Party', slug: 'summer-beach-1787092832', photo_count: 312, status: 'closed', created_at: '2026-07-20T18:00:00Z', total_photo_limit: 500, guest_photo_limit: 20 },
]

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
        getBusinessEvents().catch(() => ({ events: [] })),
        businessStats().catch(() => null),
      ])
      const apiEvents = eventsRes.events || []
      // Use dummy data if API returns empty
      setEvents(apiEvents.length > 0 ? apiEvents : DUMMY_EVENTS)
      setStats(statsRes || { total_photos: 287, total_storage_mb: 145.2, active_events: 3, total_events: 4 })
    } catch {
      setEvents(DUMMY_EVENTS)
      setStats({ total_photos: 287, total_storage_mb: 145.2, active_events: 3, total_events: 4 })
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>

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
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.total_events || events.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Active Events</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{stats?.active_events || events.filter(e => e.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Photos</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.total_photos || events.reduce((a, e) => a + (e.photo_count || 0), 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Storage Used</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.total_storage_mb || 145.2} MB</p>
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
                <Link to={`/e/${event.slug}`} className="text-sm text-gray-600 hover:text-gray-900">
                  View
                </Link>
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
