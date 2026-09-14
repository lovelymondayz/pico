import { useState, useEffect } from 'react'
import { adminStats, listAllBusinesses, suspendBusiness, listPlans, deletePlan, listAllUsers, updateUser, deleteUser } from '../services/api'
import { useToastStore } from '../stores/toast'

interface Business {
  id: string
  name: string
  email: string
  slug: string
  status: string
  created_at: string
  event_count?: number
  photo_count?: number
}

interface Plan {
  id: string
  name: string
  price: number
  max_photos: number
  max_events: number
  photos_per_guest: number
}

interface User {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

export default function Admin() {
  const [tab, setTab] = useState<'businesses' | 'users' | 'plans' | 'analytics'>('businesses')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [bizRes, statsRes, plansRes, usersRes] = await Promise.all([
        listAllBusinesses(),
        adminStats(),
        listPlans(),
        listAllUsers(),
      ])
      setBusinesses(bizRes.businesses || [])
      setPlans(plansRes.plans || [])
      setStats(statsRes?.stats || null)
      setUsers(usersRes.users || [])
    } catch {
      addToast('Failed to load admin data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (id: string, currentStatus: string) => {
    try {
      await suspendBusiness(id, currentStatus !== 'suspended')
      setBusinesses(businesses.map(b => b.id === id ? { ...b, status: currentStatus === 'suspended' ? 'active' : 'suspended' } : b))
      addToast('Business status updated', 'success')
    } catch {
      addToast('Failed to update business', 'error')
    }
  }

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return
    try {
      await deletePlan(id)
      setPlans(plans.filter(p => p.id !== id))
      addToast('Plan deleted', 'success')
    } catch {
      addToast('Failed to delete plan', 'error')
    }
  }

  const handleUpdateUser = async (id: string, data: { name: string; email: string; role: string }) => {
    try {
      await updateUser(id, data)
      setUsers(users.map(u => u.id === id ? { ...u, ...data } : u))
      addToast('User updated', 'success')
    } catch {
      addToast('Failed to update user', 'error')
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      await deleteUser(id)
      setUsers(users.filter(u => u.id !== id))
      addToast('User deleted', 'success')
    } catch {
      addToast('Failed to delete user', 'error')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Super Admin Panel</h1>
        <p className="text-text-muted">Manage all businesses, users and subscription plans</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-surface rounded-xl border border-border p-6">
          <p className="text-sm font-medium text-text-muted">Total Businesses</p>
          <p className="mt-2 text-3xl font-bold text-text">{stats?.total_businesses ?? 0}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6">
          <p className="text-sm font-medium text-text-muted">Total Events</p>
          <p className="mt-2 text-3xl font-bold text-text">{stats?.total_events ?? 0}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6">
          <p className="text-sm font-medium text-text-muted">Total Photos</p>
          <p className="mt-2 text-3xl font-bold text-text">{stats?.total_photos ?? 0}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6">
          <p className="text-sm font-medium text-text-muted">Storage</p>
          <p className="mt-2 text-3xl font-bold text-text">{(stats?.total_storage_mb ?? 0).toFixed(1)} <span className="text-lg font-normal text-text-muted">MB</span></p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6">
          <p className="text-sm font-medium text-text-muted">Active Plans</p>
          <p className="mt-2 text-3xl font-bold text-primary">{stats?.active_plans ?? 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button onClick={() => setTab('businesses')} className={`py-3 border-b-2 font-medium text-sm transition-colors ${tab === 'businesses' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}>
            Businesses ({businesses.length})
          </button>
          <button onClick={() => setTab('users')} className={`py-3 border-b-2 font-medium text-sm transition-colors ${tab === 'users' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}>
            Users ({users.length})
          </button>
          <button onClick={() => setTab('plans')} className={`py-3 border-b-2 font-medium text-sm transition-colors ${tab === 'plans' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}>
            Plans ({plans.length})
          </button>
          <button onClick={() => setTab('analytics')} className={`py-3 border-b-2 font-medium text-sm transition-colors ${tab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}>
            Analytics
          </button>
        </nav>
      </div>

      {/* Content */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Recent Uploads (7 Days)</h3>
            {stats?.recent_uploads && stats.recent_uploads.length > 0 ? (
              <div className="space-y-2">
                {stats.recent_uploads.map((u: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-text-muted w-24">{u.date}</span>
                    <div className="flex-1 bg-surface-alt rounded-full h-4 overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, (u.count / Math.max(...stats.recent_uploads.map((x: any) => x.count), 1)) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-text w-8">{u.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted">No recent uploads</p>
            )}
          </div>
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Top Events by Photo Count</h3>
            {stats?.top_events && stats.top_events.length > 0 ? (
              <div className="space-y-3">
                {stats.top_events.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-surface-alt rounded-lg">
                    <div>
                      <p className="font-medium text-text">{e.event_name}</p>
                      <p className="text-sm text-text-muted">{e.business_name}</p>
                    </div>
                    <span className="text-2xl font-bold text-primary">{e.photo_count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted">No events yet</p>
            )}
          </div>
        </div>
      )}

      {tab === 'businesses' && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {businesses.map((biz) => (
              <div key={biz.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-surface-alt">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text">{biz.name}</p>
                  <p className="text-sm text-text-muted">{biz.email} · {biz.event_count || 0} events · {biz.photo_count || 0} photos</p>
                  <p className="text-xs text-text-subtle">Since {new Date(biz.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${biz.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                    {biz.status}
                  </span>
                  <button onClick={() => handleSuspend(biz.id, biz.status)} className={`px-3 py-1 text-sm rounded-md ${biz.status === 'active' ? 'text-danger hover:bg-danger-subtle' : 'text-success hover:bg-success-subtle'}`}>
                    {biz.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {users.map((user) => (
              <UserRow key={user.id} user={user} onUpdate={handleUpdateUser} onDelete={handleDeleteUser} />
            ))}
            {users.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-text-muted">No users yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-surface rounded-xl border border-border p-6">
                <h3 className="font-semibold text-text">{plan.name}</h3>
                <p className="mt-1 text-2xl font-bold text-primary">${plan.price}<span className="text-sm font-normal text-text-muted">/mo</span></p>
                <ul className="mt-4 space-y-2 text-sm text-text-muted">
                  <li>• {plan.max_photos.toLocaleString()} photos</li>
                  <li>• {plan.max_events} events</li>
                  <li>• {plan.photos_per_guest} photos per guest</li>
                </ul>
                <div className="mt-4 flex gap-2">
                  <button className="px-3 py-1 text-sm text-primary hover:bg-primary-subtle rounded-md">Edit</button>
                  <button onClick={() => handleDeletePlan(plan.id)} className="px-3 py-1 text-sm text-danger hover:bg-danger-subtle rounded-md">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UserRow({ user, onUpdate, onDelete }: { user: User; onUpdate: (id: string, data: any) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)

  const handleSave = () => {
    onUpdate(user.id, { name, email, role })
    setEditing(false)
  }

  return (
    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-surface-alt">
      {editing ? (
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm" placeholder="Name" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm" placeholder="Email" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-sm">
            <option value="business">Business</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover">Save</button>
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg hover:bg-surface-alt">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text">{user.name}</p>
            <p className="text-sm text-text-muted">{user.email}</p>
            <p className="text-xs text-text-subtle">Since {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-2 py-1 text-xs rounded-full ${user.role === 'admin' ? 'bg-primary-subtle text-primary' : 'bg-surface-alt text-text-muted'}`}>
              {user.role}
            </span>
            <button onClick={() => setEditing(true)} className="px-3 py-1 text-sm text-primary hover:bg-primary-subtle rounded-md">Edit</button>
            <button onClick={() => onDelete(user.id)} className="px-3 py-1 text-sm text-danger hover:bg-danger-subtle rounded-md">Delete</button>
          </div>
        </>
      )}
    </div>
  )
}
