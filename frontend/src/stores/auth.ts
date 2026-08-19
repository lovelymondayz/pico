import { create } from 'zustand'

interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'business'
  created_at: string
}

interface Business {
  id: number
  user_id: number
  name: string
  slug: string
  logo_url?: string
  created_at: string
}

interface AuthState {
  token: string | null
  user: User | null
  business: Business | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, businessName: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('pico_token'),
  user: JSON.parse(localStorage.getItem('pico_user') || 'null'),
  business: JSON.parse(localStorage.getItem('pico_business') || 'null'),
  isAuthenticated: !!localStorage.getItem('pico_token'),

  login: async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Login failed')
    }
    const data = await res.json()
    localStorage.setItem('pico_token', data.token)
    localStorage.setItem('pico_user', JSON.stringify(data.user))
    set({ token: data.token, user: data.user, isAuthenticated: true })
  },

  register: async (email: string, password: string, name: string, businessName: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, business_name: businessName }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Registration failed')
    }
    const data = await res.json()
    localStorage.setItem('pico_token', data.token)
    localStorage.setItem('pico_user', JSON.stringify(data.user))
    localStorage.setItem('pico_business', JSON.stringify(data.business))
    set({ token: data.token, user: data.user, business: data.business, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('pico_token')
    localStorage.removeItem('pico_user')
    localStorage.removeItem('pico_business')
    set({ token: null, user: null, business: null, isAuthenticated: false })
  },
}))
