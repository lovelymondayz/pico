import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getEvent, registerGuest, listPhotos, GuestToken } from '../services/api'

interface Photo {
  id: number
  url: string
  thumbnail_url: string
  width: number
  height: number
  created_at: string
}

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const [event, setEvent] = useState<any>(null)
  const [guestToken, setGuestToken] = useState<string | null>(null)
  const [guest, setGuest] = useState<any>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!slug) return

    const stored = localStorage.getItem(`pico-guest-${slug}`)
    if (stored) {
      try {
        const data: GuestToken = JSON.parse(stored)
        setGuestToken(data.token)
      } catch (e) {}
    }

    loadEvent()
  }, [slug])

  useEffect(() => {
    if (!guestToken || !event) return
    loadPhotos()
    setupSSE()
  }, [guestToken, event])

  const loadEvent = async () => {
    try {
      const res = await getEvent(slug!)
      setEvent(res.event)
    } catch (err: any) {
      alert('Event not found or no longer active')
    } finally {
      setLoading(false)
    }
  }

  const loadPhotos = async () => {
    if (!slug) return
    try {
      const res = await listPhotos(slug, 50, 0)
      setPhotos(res.photos)
    } catch (err) {
      console.error('Failed to load photos', err)
    }
  }

  const setupSSE = () => {
    if (!slug) return
    const evtSource = new EventSource(`/api/e/${slug}/photos/stream`)
    evtSource.addEventListener('photo', (e: any) => {
      try {
        const photo = JSON.parse(e.data)
        setPhotos(prev => {
          if (prev.find(p => p.id === photo.id)) return prev
          return [photo, ...prev]
        })
      } catch (err) {}
    })
    return () => evtSource.close()
  }

  const handleNameSubmit = async () => {
    if (!slug || !guestName.trim()) return
    try {
      const res = await registerGuest(slug, guestName.trim())
      setGuestToken(res.token)
      setGuest(res.guest)
      localStorage.setItem(`pico-guest-${slug}`, JSON.stringify({
        token: res.token,
        guest: res.guest,
      }))
      setShowNameInput(false)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register')
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !slug || !guestToken) return

    setUploading(true)
    const formData = new FormData()
    formData.append('photo', file)

    try {
      const res = await fetch(`/api/e/${slug}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${guestToken}`,
          'X-Guest-Token': guestToken,
        },
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        setPhotos(prev => [data.photo, ...prev])
      } else {
        alert(data.error || 'Upload failed')
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!event) {
    return <div className="flex items-center justify-center h-screen">Event not found</div>
  }

  const guestLimit = event.guest_photo_limit || 20
  const eventLimit = event.total_photo_limit || 500
  const guestUploads = guest?.photo_count || 0
  const remainingPersonal = Math.max(0, guestLimit - guestUploads)
  const remainingEvent = Math.max(0, eventLimit - photos.length)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      {event.cover_image_url && (
        <div className="relative h-48 bg-gradient-to-r from-purple-600 to-pink-600">
          <img src={event.cover_image_url} alt={event.name} className="w-full h-full object-cover opacity-50" />
        </div>
      )}

      {/* Event Info */}
      <div className="px-4 py-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        {event.description && <p className="mt-2 text-gray-600">{event.description}</p>}
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Your uploads</p>
              <p className="text-xl font-bold text-purple-600">{guestUploads} / {guestLimit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Event photos</p>
              <p className="text-xl font-bold text-pink-600">{photos.length} / {eventLimit}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Name Input (first time) */}
      {!guestToken && !showNameInput && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowNameInput(true)}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700"
          >
            Join Event
          </button>
        </div>
      )}

      {showNameInput && !guestToken && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-3"
            />
            <button
              onClick={handleNameSubmit}
              className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Upload Buttons */}
      {guestToken && remainingPersonal > 0 && remainingEvent > 0 && (
        <div className="px-4 pb-4">
          <div className="flex gap-3">
            <label className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold text-center cursor-pointer hover:bg-purple-700">
              📷 Take Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleUpload}
                className="hidden"
                ref={fileInputRef}
                disabled={uploading}
              />
            </label>
            <label className="flex-1 bg-pink-600 text-white py-3 rounded-xl font-semibold text-center cursor-pointer hover:bg-pink-700">
              📁 Upload
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          {uploading && <p className="text-center text-sm text-gray-500 mt-2">Uploading...</p>}
        </div>
      )}

      {guestToken && remainingPersonal === 0 && (
        <div className="px-4 pb-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-yellow-800">You've reached your upload limit ({guestLimit} photos)</p>
          </div>
        </div>
      )}

      {/* Gallery */}
      <div className="px-4 pb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Shared Moments</h2>
        {photos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No photos yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {photos.map(photo => (
              <div key={photo.id} className="aspect-square bg-gray-200">
                <img
                  src={photo.thumbnail_url || photo.url}
                  alt="Event photo"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
