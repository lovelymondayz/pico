import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getEventByUUID, listPhotos, closeEvent, downloadPhotos } from '../services/api'

export default function EventDetail() {
  const { uuid } = useParams<{ uuid: string }>()
  const [event, setEvent] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    if (uuid) loadData()
  }, [uuid])

  const loadData = async () => {
    try {
      const eventRes = await getEventByUUID(uuid!)
      const ev = eventRes.event || eventRes
      setEvent(ev)
      const photosRes = await listPhotos(ev.slug)
      setPhotos(photosRes.photos || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  const handleQR = () => {
    setShowQR(true)
  }

  const handleClose = async () => {
    if (!confirm('Are you sure you want to close this event? This cannot be undone.')) return
    try {
      await closeEvent(event.id)
      window.location.href = '/dashboard'
    } catch (err: any) {
      alert(err.message || 'Failed to close event')
    }
  }

  const handleDownload = async () => {
    try {
      const res = await downloadPhotos(event.id)
      if (res.photos && res.photos.length > 0) {
        res.photos.forEach((p: any, i: number) => {
          setTimeout(() => {
            const a = document.createElement('a')
            a.href = p.url
            a.download = p.filename
            a.target = '_blank'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
          }, i * 500)
        })
      }
    } catch (err: any) {
      alert(err.message || 'Failed to download photos')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>

  if (error) return <div className="max-w-2xl mx-auto"><div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div></div>

  if (!event) return <div className="text-center py-20"><p className="text-gray-500">Event not found</p></div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-gray-600">{event.description || 'No description'}</p>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(event.start_date).toLocaleDateString()} — {new Date(event.end_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/dashboard" className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            ← Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Photos</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{photos.length} / {event.total_photo_limit}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Guest Limit</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{event.guest_photo_limit}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Downloads</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{event.allow_downloads ? 'Enabled' : 'Disabled'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Status</p>
          <p className={`mt-2 text-3xl font-bold ${event.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{event.status}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleQR} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
            📱 Show QR Code
          </button>
          <a href={`/e/${event.slug}`} target="_blank" className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            🔗 Open Guest Page
          </a>
          {event.allow_downloads && (
            <button onClick={handleDownload} className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
              📥 Download All ({photos.length})
            </button>
          )}
          <button onClick={handleClose} className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
            🚪 Close Event
          </button>
        </div>

        {showQR && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">Share this QR code with guests:</p>
            <img src={`/api/business/events/${event.id}/qr`} alt="Event QR Code" className="w-48 h-48 border border-gray-200 rounded-lg" />
            <p className="text-xs text-gray-500 mt-2">Or share this link: <a href={`/e/${event.slug}`} className="text-purple-600 hover:underline">{`${window.location.origin}/e/${event.slug}`}</a></p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos ({photos.length})</h2>
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                <img src={photo.thumbnail_url || photo.url} alt={photo.original_filename} className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No photos yet</p>
        )}
      </div>
    </div>
  )
}
