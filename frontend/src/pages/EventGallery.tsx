import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getEvent, registerGuest, listPhotos, uploadPhoto } from '../services/api'

interface Photo {
  id: number
  url: string
  thumbnail_url: string
  original_filename: string
  width: number
  height: number
  created_at: string
}

export default function EventGallery() {
  const { slug } = useParams<{ slug: string }>()
  const [event, setEvent] = useState<any>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [guestName, setGuestName] = useState('')
  const [guestToken, setGuestToken] = useState<string | null>(localStorage.getItem(`guest_${slug}`))
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (slug) loadEvent()
  }, [slug])

  useEffect(() => {
    if (event?.id) loadPhotos()
  }, [event?.id])

  const loadEvent = async () => {
    try {
      const res = await getEvent(slug!)
      setEvent(res.event || res)
    } catch {
      // Event not found
    } finally {
      setLoading(false)
    }
  }

  const loadPhotos = async () => {
    try {
      const res = await listPhotos(slug!)
      setPhotos(res.photos || [])
    } catch {
      // Ignore
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName.trim() || !slug) return
    try {
      const res = await registerGuest(slug, guestName)
      setGuestToken(res.guest_token || res.guest?.guest_token)
      localStorage.setItem(`guest_${slug}`, res.guest_token || res.guest?.guest_token)
      setShowUpload(true)
    } catch {
      // Silently fail
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !slug) return
    setUploading(true)
    try {
      await uploadPhoto(slug, guestToken || '', file)
      await loadPhotos()
    } catch {
      // Silently fail
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>

  if (!event) return <div className="text-center py-20"><p className="text-gray-500">Event not found</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative h-48 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl font-bold text-white text-center px-4">{event.name}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Guest Registration */}
        {!guestToken && (
          <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Join this event</h2>
            <form onSubmit={handleRegister} className="flex gap-3">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name"
                required
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
              <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
                Join
              </button>
            </form>
          </div>
        )}

        {/* Upload Button */}
        {guestToken && (
          <div className="mb-8 flex justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              id="photo-upload"
            />
            <div className="flex gap-3">
              <label
                htmlFor="photo-upload"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 cursor-pointer transition-colors"
              >
                {uploading ? 'Uploading...' : '+ Upload Photo'}
              </label>
              <button
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click()
                }}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors sm:hidden"
              >
                📷 Camera
              </button>
            </div>
          </div>
        )}

        {/* Photo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setLightbox(photo)}
              className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-gray-200"
            >
              <img
                src={photo.thumbnail_url || photo.url}
                alt={photo.original_filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No photos yet. Be the first to upload!</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.url}
            alt={lightbox.original_filename}
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
