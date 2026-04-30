const EVENT_NAME = 'w2c-toast'

export function toast(message, type = 'info', opts = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { message, type, ...opts } }))
}

toast.success = (message, opts) => toast(message, 'success', opts)
toast.error = (message, opts) => toast(message, 'error', opts)
toast.info = (message, opts) => toast(message, 'info', opts)

export const TOAST_EVENT_NAME = EVENT_NAME

