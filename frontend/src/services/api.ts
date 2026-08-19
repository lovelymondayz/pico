const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('pico_token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

async function handleRes(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

// ── Auth ──

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleRes(res)
}

export async function register(email: string, password: string, name: string, businessName: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, business_name: businessName }),
  })
  return handleRes(res)
}

// ── Public ──

export async function getEvent(slug: string) {
  const res = await fetch(`${API_BASE}/e/${slug}`)
  return handleRes(res)
}

export async function registerGuest(slug: string, name: string) {
  const res = await fetch(`${API_BASE}/e/${slug}/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return handleRes(res)
}

export async function listPhotos(slug: string, limit: number = 30, offset: number = 0) {
  const res = await fetch(`${API_BASE}/e/${slug}/photos?limit=${limit}&offset=${offset}`)
  return handleRes(res)
}

export async function uploadPhoto(slug: string, guestToken: string, file: File, caption?: string) {
  const formData = new FormData()
  formData.append('photo', file)
  if (caption) formData.append('caption', caption)
  const res = await fetch(`${API_BASE}/e/${slug}/upload`, {
    method: 'POST',
    headers: { 'X-Guest-Token': guestToken, ...authHeaders() },
    body: formData,
  })
  return handleRes(res)
}

// ── Business ──

export async function getBusinessEvents() {
  const res = await fetch(`${API_BASE}/business/events`, {
    headers: { ...authHeaders() },
  })
  return handleRes(res)
}

export async function createEvent(data: {
  name: string
  description?: string
  start_date?: string
  end_date?: string
  total_photo_limit?: number
  guest_photo_limit?: number
  allow_downloads?: boolean
}) {
  const res = await fetch(`${API_BASE}/business/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  return handleRes(res)
}

export async function updateEvent(id: number, data: any) {
  const res = await fetch(`${API_BASE}/business/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  return handleRes(res)
}

export async function closeEvent(id: number) {
  const res = await fetch(`${API_BASE}/business/events/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  return handleRes(res)
}

export async function generateQR(id: number) {
  const res = await fetch(`${API_BASE}/business/events/${id}/qr`, {
    headers: { ...authHeaders() },
  })
  return handleRes(res)
}

export async function businessStats() {
  const res = await fetch(`${API_BASE}/business/stats`, {
    headers: { ...authHeaders() },
  })
  return handleRes(res)
}

// ── Admin ──

export async function adminStats() {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: { ...authHeaders() },
  })
  return handleRes(res)
}

export async function listAllBusinesses() {
  const res = await fetch(`${API_BASE}/admin/businesses`, {
    headers: { ...authHeaders() },
  })
  return handleRes(res)
}

export async function suspendBusiness(id: number, suspended: boolean) {
  const res = await fetch(`${API_BASE}/admin/businesses/${id}/${suspended ? 'suspend' : 'activate'}`, {
    method: 'PUT',
    headers: { ...authHeaders() },
  })
  return handleRes(res)
}

export async function listPlans() {
  const res = await fetch(`${API_BASE}/admin/plans`, {
    headers: { ...authHeaders() },
  })
  return handleRes(res)
}

export async function createPlan(data: any) {
  const res = await fetch(`${API_BASE}/admin/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  return handleRes(res)
}

export async function updatePlan(id: number, data: any) {
  const res = await fetch(`${API_BASE}/admin/plans/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  return handleRes(res)
}

export async function deletePlan(id: number) {
  const res = await fetch(`${API_BASE}/admin/plans/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  return handleRes(res)
}
