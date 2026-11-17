import { useEffect, useState } from 'react'

function calcRemainingSeconds(targetIso: string | null | undefined): number {
  if (!targetIso) return 0
  const targetMs = new Date(targetIso).getTime()
  if (Number.isNaN(targetMs)) return 0
  return Math.max(0, Math.floor((targetMs - Date.now()) / 1000))
}

export interface CountdownState {
  remainingSeconds: number
  minutes: number
  seconds: number
  formatted: string
  isExpired: boolean
}

export function useCountdown(targetIso: string | null | undefined): CountdownState {
  const [remainingSeconds, setRemainingSeconds] = useState(() => calcRemainingSeconds(targetIso))

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setRemainingSeconds(calcRemainingSeconds(targetIso))
    }, 0)

    if (!targetIso) {
      return () => window.clearTimeout(syncTimer)
    }

    const interval = window.setInterval(() => {
      const next = calcRemainingSeconds(targetIso)
      setRemainingSeconds(next)
      if (next <= 0) {
        window.clearInterval(interval)
      }
    }, 1000)

    return () => {
      window.clearTimeout(syncTimer)
      window.clearInterval(interval)
    }
  }, [targetIso])

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return {
    remainingSeconds,
    minutes,
    seconds,
    formatted,
    isExpired: remainingSeconds <= 0,
  }
}
