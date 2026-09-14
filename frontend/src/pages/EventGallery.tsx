import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getEvent, registerGuest, listPhotos, uploadPhoto, searchPhotos, listMyPhotos } from '../services/api'

interface Photo {
  id: string
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
  const [showMyPhotos, setShowMyPhotos] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (slug) loadEvent()
  }, [slug])

  useEffect(() => {
    if (event?.id) loadPhotos()
  }, [event?.id, searchQuery, showMyPhotos])

  const loadEvent = async () => {
    try {
      const res = await getEvent(slug!)
      setEvent(res.event || res)
    } catch {
      setError('Event not found')
    } finally {
      setLoading(false)
    }
  }

  const loadPhotos = async () => {
    try {
      let res
      if (showMyPhotos && guestToken) {
        res = await listMyPhotos(slug!, guestToken)
      } else if (searchQuery.trim()) {
        res = await searchPhotos(slug!, searchQuery)
      } else {
        res = await listPhotos(slug!)
      }
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
      const token = res.guest_token || res.guest?.guest_token
      setGuestToken(token)
      localStorage.setItem(`guest_${slug}`, token)
    } catch {
      setError('Failed to register as guest')
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !slug) return
    setUploading(true)
    setError('')
    try {
      await uploadPhoto(slug, guestToken || '', file)
      // Reload photos multiple times with delay to wait for processing
      await loadPhotos()
      setTimeout(() => loadPhotos(), 500)
      setTimeout(() => loadPhotos(), 1500)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const copyLink = () => {
    const link = `${window.location.origin}/e/${slug}`
    navigator.clipboard.writeText(link)
    alert('Guest link copied!')
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  if (error && !event) return <div className="text-center py-20"><p className="text-danger">{error}</p></div>

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="relative h-48 bg-gradient-to-r from-primary to-primary-active">
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl font-bold text-white text-center px-4">{event?.name}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-3 bg-danger-subtle border border-danger rounded-lg text-sm text-danger">
            {error}
          </div>
        )}

        {/* Guest Registration */}
        {!guestToken && (
          <div className="mb-8 bg-surface rounded-xl border border-border p-6 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-text mb-4">Join this event</h2>
            <form onSubmit={handleRegister} className="flex gap-3">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name"
                required
                className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors">
                Join
              </button>
            </form>
            <div className="mt-4">
              <p className="text-xs text-text-muted mb-2">Share this link with other guests:</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/e/${slug}`}
                  className="flex-1 px-3 py-1.5 text-xs bg-surface-alt border border-border rounded"
                />
                <button onClick={copyLink} className="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:bg-surface-alt transition-colors">
                  Copy
                </button>
              </div>
            </div>
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
            <div className="flex gap-3 flex-wrap justify-center">
              <label
                htmlFor="photo-upload"
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover cursor-pointer transition-colors"
              >
                {uploading ? 'Uploading...' : '+ Upload Photo'}
              </label>
              <button
                onClick={() => setShowMyPhotos(!showMyPhotos)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  showMyPhotos
                    ? 'bg-primary-subtle text-primary border border-primary'
                    : 'bg-surface border border-border text-text hover:bg-surface-alt'
                }`}
              >
                {showMyPhotos ? 'All Photos' : 'My Photos'}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename or guest name..."
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setLightbox(photo)}
              className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-surface-alt"
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
            <p className="text-text-muted">No photos yet. Be the first to upload!</p>
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
            className="absolute top-4 right-4 text-white text-2xl hover:text-neutral-300"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
