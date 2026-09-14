import { create } from 'zustand'
import { login as apiLogin, register as apiRegister } from '../services/api'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'business'
  created_at: string
}

interface Business {
  id: string
  user_id: string
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
    const data = await apiLogin(email, password)
    localStorage.setItem('pico_token', data.token)
    localStorage.setItem('pico_user', JSON.stringify(data.user))
    set({ token: data.token, user: data.user, isAuthenticated: true })
  },

  register: async (email: string, password: string, name: string, businessName: string) => {
    const data = await apiRegister(email, password, name, businessName)
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
