import { useToastStore } from '../stores/toast'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center justify-between gap-3 min-w-[280px] animate-in slide-in-from-right ${
            toast.type === 'success'
              ? 'bg-success text-white'
              : toast.type === 'error'
              ? 'bg-danger text-white'
              : 'bg-info text-white'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
