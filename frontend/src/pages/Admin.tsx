import { useState, useEffect } from 'react'
import { adminStats, listAllBusinesses, suspendBusiness, listPlans, createPlan, updatePlan, deletePlan } from '../services/api'

interface Business {
  id: number
  name: string
  email: string
  slug: string
  status: string
  created_at: string
  event_count?: number
  photo_count?: number
}

interface Plan {
  id: number
  name: string
  price: number
  max_photos: number
  max_events: number
  photos_per_guest: number
}

const DUMMY_BUSINESSES: Business[] = []
const DUMMY_PLANS: Plan[] = []

export default function Admin() {
  const [tab, setTab] = useState<'businesses' | 'plans' | 'analytics'>('businesses')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [bizRes, statsRes, plansRes] = await Promise.all([
        listAllBusinesses(),
        adminStats(),
        listPlans(),
      ])
      setBusinesses(bizRes.businesses || [])
      setPlans(plansRes.plans || [])
      setStats(statsRes?.stats || null)
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (id: number, currentStatus: string) => {
    try {
      await suspendBusiness(id, currentStatus !== 'suspended')
      setBusinesses(businesses.map(b => b.id === id ? { ...b, status: currentStatus === 'suspended' ? 'active' : 'suspended' } : b))
    } catch {
      // Silently fail
    }
  }

  const handleDeletePlan = async (id: number) => {
    if (!confirm('Delete this plan?')) return
    try {
      await deletePlan(id)
      setPlans(plans.filter(p => p.id !== id))
    } catch {
      // Silently fail
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Panel</h1>
        <p className="text-gray-600">Manage all businesses and subscription plans</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Businesses</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.total_businesses ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Events</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.total_events ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Photos</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.total_photos ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Storage</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{(stats?.total_storage_mb ?? 0).toFixed(1)} <span className="text-lg font-normal text-gray-500">MB</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Active Plans</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{stats?.active_plans ?? 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setTab('businesses')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              tab === 'businesses' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Businesses ({businesses.length})
          </button>
          <button
            onClick={() => setTab('plans')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              tab === 'plans' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Plans ({plans.length})
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              tab === 'analytics' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Analytics
          </button>
        </nav>
      </div>

      {/* Content */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Recent Uploads Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Uploads (7 Days)</h3>
            {stats?.recent_uploads && stats.recent_uploads.length > 0 ? (
              <div className="space-y-2">
                {stats.recent_uploads.map((u: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-24">{u.date}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, (u.count / Math.max(...stats.recent_uploads.map((x: any) => x.count), 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{u.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recent uploads</p>
            )}
          </div>

          {/* Top Events */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Events by Photo Count</h3>
            {stats?.top_events && stats.top_events.length > 0 ? (
              <div className="space-y-3">
                {stats.top_events.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{e.event_name}</p>
                      <p className="text-sm text-gray-500">{e.business_name}</p>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">{e.photo_count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No events yet</p>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {tab === 'businesses' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {businesses.map((biz) => (
              <div key={biz.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{biz.name}</p>
                  <p className="text-sm text-gray-500">{biz.email} · {biz.event_count || 0} events · {biz.photo_count || 0} photos</p>
                  <p className="text-xs text-gray-400">Since {new Date(biz.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${biz.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {biz.status}
                  </span>
                  <button
                    onClick={() => handleSuspend(biz.id, biz.status)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      biz.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {biz.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-2xl font-bold text-purple-600">${plan.price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li>• {plan.max_photos.toLocaleString()} photos</li>
                  <li>• {plan.max_events} events</li>
                  <li>• {plan.photos_per_guest} photos per guest</li>
                </ul>
                <div className="mt-4 flex gap-2">
                  <button className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-md">Edit</button>
                  <button onClick={() => handleDeletePlan(plan.id)} className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
