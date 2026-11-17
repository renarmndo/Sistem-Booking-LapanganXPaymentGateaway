import { env } from '@/config/env'

export interface SnapPayCallbacks {
  onSuccess?: (result: unknown) => void
  onPending?: (result: unknown) => void
  onError?: (result: unknown) => void
  onClose?: () => void
}

export interface MidtransSnap {
  pay: (token: string, callbacks?: SnapPayCallbacks) => void
}

declare global {
  interface Window {
    snap?: MidtransSnap
  }
}

let snapLoadPromise: Promise<MidtransSnap> | null = null

export function getSnapScriptURL(): string {
  return env.midtransEnv === 'production'
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'
}

export function loadSnapScript(): Promise<MidtransSnap> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Snap hanya tersedia di browser'))
  }
  if (window.snap) {
    return Promise.resolve(window.snap)
  }
  if (snapLoadPromise) {
    return snapLoadPromise
  }

  snapLoadPromise = new Promise<MidtransSnap>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = getSnapScriptURL()
    script.async = true
    if (env.midtransClientKey) {
      script.setAttribute('data-client-key', env.midtransClientKey)
    }
    script.onload = () => {
      if (window.snap) {
        resolve(window.snap)
      } else {
        snapLoadPromise = null
        reject(new Error('Midtrans Snap gagal diinisialisasi'))
      }
    }
    script.onerror = () => {
      snapLoadPromise = null
      reject(new Error('Gagal memuat skrip Midtrans Snap'))
    }
    document.head.appendChild(script)
  })

  return snapLoadPromise
}
