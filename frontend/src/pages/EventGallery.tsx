import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getEvent, registerGuest, listPhotos, uploadPhoto, searchPhotos, listMyPhotos } from '../services/api'
import { useToastStore } from '../stores/toast'

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
  const [guestInfo, setGuestInfo] = useState<{photoCount: number, photoLimit: number} | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [showMyPhotos, setShowMyPhotos] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((s) => s.addToast)

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
      addToast('Event not found', 'error')
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
      addToast('Failed to load photos', 'error')
    }
  }

  const loadGuestInfo = async () => {
    if (!guestToken || !slug) return
    try {
      const res = await listMyPhotos(slug, guestToken)
      const myPhotoCount = res.photos?.length || 0
      setGuestInfo({
        photoCount: myPhotoCount,
        photoLimit: event?.guest_photo_limit || 0
      })
    } catch {
      // Fallback: try to get from localStorage
      const stored = localStorage.getItem(`guest_info_${slug}`)
      if (stored) {
        setGuestInfo(JSON.parse(stored))
      }
    }
  }

  useEffect(() => {
    if (guestToken && event) {
      loadGuestInfo()
    }
  }, [guestToken, event])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName.trim() || !slug) return
    try {
      const res = await registerGuest(slug, guestName)
      const token = res.guest_token || res.guest?.guest_token
      setGuestToken(token)
      localStorage.setItem(`guest_${slug}`, token)
      
      const limit = event?.guest_photo_limit || 0
      const info = { photoCount: 0, photoLimit: limit }
      setGuestInfo(info)
      localStorage.setItem(`guest_info_${slug}`, JSON.stringify(info))
      
      addToast(`Welcome! You can upload ${limit} photos.`, 'success')
    } catch {
      addToast('Failed to register as guest', 'error')
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !slug) return
    
    if (guestInfo && guestInfo.photoCount >= guestInfo.photoLimit) {
      addToast(`You've reached your limit of ${guestInfo.photoLimit} photos`, 'error')
      return
    }
    
    setUploading(true)
    try {
      await uploadPhoto(slug, guestToken || '', file)
      addToast('Photo uploaded!', 'success')
      
      if (guestInfo) {
        const newInfo = { ...guestInfo, photoCount: guestInfo.photoCount + 1 }
        setGuestInfo(newInfo)
        localStorage.setItem(`guest_info_${slug}`, JSON.stringify(newInfo))
      }
      
      await loadPhotos()
      setTimeout(() => loadPhotos(), 500)
      setTimeout(() => loadPhotos(), 1500)
    } catch (err: any) {
      addToast(err.message || 'Upload failed', 'error')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const copyLink = () => {
    const link = `${window.location.origin}/e/${slug}`
    navigator.clipboard.writeText(link)
    addToast('Guest link copied!', 'success')
  }

  const remainingPhotos = guestInfo ? guestInfo.photoLimit - guestInfo.photoCount : null
  const hasReachedLimit = remainingPhotos !== null && remainingPhotos <= 0

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  if (!event) return <div className="text-center py-20"><p className="text-text-muted">Event not found</p></div>

  return (
    <div className="min-h-screen bg-bg">
      <div className="relative h-48 bg-gradient-to-r from-primary to-primary-active">
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl font-bold text-white text-center px-4">{event.name}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!guestToken && (
          <div className="mb-8 bg-surface rounded-xl border border-border p-6 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-text mb-4">Join this event</h2>
            <form onSubmit={handleRegister} className="flex gap-3">
              <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name" required className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors">Join</button>
            </form>
            <div className="mt-4">
              <p className="text-xs text-text-muted mb-2">Share this link with other guests:</p>
              <div className="flex gap-2">
                <input readOnly value={`${window.location.origin}/e/${slug}`} className="flex-1 px-3 py-1.5 text-xs bg-surface-alt border border-border rounded" />
                <button onClick={copyLink} className="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:bg-surface-alt transition-colors">Copy</button>
              </div>
            </div>
          </div>
        )}

        {guestToken && (
          <div className="mb-8">
            {/* Photo Counter */}
            {guestInfo && (
              <div className={`mb-4 p-4 rounded-xl border text-center ${
                hasReachedLimit 
                  ? 'bg-warning-subtle border-warning' 
                  : 'bg-surface border-border'
              }`}>
                {hasReachedLimit ? (
                  <div>
                    <p className="text-warning font-semibold">📸 You've uploaded all your photos!</p>
                    <p className="text-sm text-text-muted mt-1">
                      {guestInfo.photoCount} of {guestInfo.photoLimit} photos uploaded
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-text font-semibold">
                      📸 {remainingPhotos} photo{remainingPhotos !== 1 ? 's' : ''} remaining
                    </p>
                    <p className="text-sm text-text-muted mt-1">
                      {guestInfo.photoCount} of {guestInfo.photoLimit} photos uploaded
                    </p>
                    <div className="mt-2 w-full bg-surface-alt rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${(guestInfo.photoCount / guestInfo.photoLimit) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Controls */}
            <div className="flex justify-center">
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handleUpload} 
                className="hidden" 
                id="photo-upload" 
                disabled={hasReachedLimit}
              />
              <div className="flex gap-3 flex-wrap justify-center">
                <label 
                  htmlFor="photo-upload" 
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    hasReachedLimit 
                      ? 'bg-surface-alt text-text-muted cursor-not-allowed' 
                      : 'bg-primary text-white hover:bg-primary-hover cursor-pointer'
                  }`}
                >
                  {uploading ? 'Uploading...' : hasReachedLimit ? 'Limit Reached' : '+ Upload Photo'}
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
          </div>
        )}

        <div className="mb-6">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by filename or guest name..." className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} onClick={() => setLightbox(photo)} className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-surface-alt">
              <img src={photo.thumbnail_url || photo.url} alt={photo.original_filename} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="text-center py-12"><p className="text-text-muted">No photos yet. Be the first to upload!</p></div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox.url} alt={lightbox.original_filename} className="max-w-full max-h-full object-contain" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white text-2xl hover:text-neutral-300">✕</button>
        </div>
      )}
    </div>
  )
}
