const API_BASE = '/api'

export interface GuestToken {
  token: string
  guest: any
}

export async function getEvent(slug: string) {
  const res = await fetch(`${API_BASE}/e/${slug}`)
  if (!res.ok) throw new Error('Event not found')
  return res.json()
}

export async function registerGuest(slug: string, name: string): Promise<GuestToken> {
  const res = await fetch(`${API_BASE}/e/${slug}/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to register guest')
  return res.json()
}

export async function listPhotos(slug: string, limit: number = 30, offset: number = 0) {
  const res = await fetch(`${API_BASE}/e/${slug}/photos?limit=${limit}&offset=${offset}`)
  if (!res.ok) throw new Error('Failed to fetch photos')
  return res.json()
}
