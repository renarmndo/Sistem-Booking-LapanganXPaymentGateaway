import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/ui'
import {
  areSlotsConsecutive,
  calculateSlotsTotal,
  DEFAULT_MAX_BOOKING_HOURS,
  formatSlotRange,
  toggleSlotSelection,
} from '@/utils/slot.utils'
import type { SlotAvailability, SlotStatus } from '../types/booking.types'

export function useSlotSelection(
  slots: SlotAvailability[],
  maxHours = DEFAULT_MAX_BOOKING_HOURS,
  initialSlots: SlotAvailability[] = [],
) {
  const toast = useToast()
  const [rawSelected, setRawSelected] = useState<SlotAvailability[]>(initialSlots)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [highlightedTimes, setHighlightedTimes] = useState<string[]>([])
  const prevStatusMapRef = useRef<Map<string, SlotStatus>>(new Map())
  const lastWarnKeyRef = useRef<string>('')

  const { selectedSlots, droppedKeys } = useMemo(() => {
    if (rawSelected.length === 0 || slots.length === 0) {
      return { selectedSlots: rawSelected, droppedKeys: '' }
    }
    const availMap = new Map(slots.map((s) => [s.start_time, s]))
    const removed = rawSelected.filter((sel) => {
      const latest = availMap.get(sel.start_time)
      return !latest || latest.status !== 'available'
    })
    if (removed.length === 0) {
      return { selectedSlots: rawSelected, droppedKeys: '' }
    }
    const stillValid = rawSelected.filter((sel) => {
      const latest = availMap.get(sel.start_time)
      return latest && latest.status === 'available'
    })
    const nextValid = areSlotsConsecutive(stillValid) ? stillValid : []
    return {
      selectedSlots: nextValid,
      droppedKeys: removed.map((r) => r.start_time).join(','),
    }
  }, [rawSelected, slots])

  useEffect(() => {
    if (droppedKeys && lastWarnKeyRef.current !== droppedKeys) {
      lastWarnKeyRef.current = droppedKeys
      toast.warning(
        'Sebagian slot yang Anda pilih baru saja tidak tersedia dan dilepas dari pilihan.',
      )
    } else if (!droppedKeys) {
      lastWarnKeyRef.current = ''
    }
  }, [droppedKeys, toast])

  useEffect(() => {
    if (slots.length === 0) return

    const prevMap = prevStatusMapRef.current
    const nextMap = new Map<string, SlotStatus>()
    const changed: string[] = []

    for (const s of slots) {
      nextMap.set(s.start_time, s.status)
      const prevStatus = prevMap.get(s.start_time)
      if (prevStatus !== undefined && prevStatus !== s.status) {
        changed.push(s.start_time)
      }
    }
    prevStatusMapRef.current = nextMap

    if (changed.length > 0) {
      const startTimer = window.setTimeout(() => setHighlightedTimes(changed), 0)
      const clearTimer = window.setTimeout(() => setHighlightedTimes([]), 2500)
      return () => {
        window.clearTimeout(startTimer)
        window.clearTimeout(clearTimer)
      }
    }
  }, [slots])

  const toggleSlot = useCallback(
    (slot: SlotAvailability) => {
      const result = toggleSlotSelection(selectedSlots, slot, maxHours)
      if (!result.ok) {
        setSelectionError(result.error ?? null)
        return
      }
      setSelectionError(null)
      setRawSelected(result.next)
    },
    [selectedSlots, maxHours],
  )

  const clearSelection = useCallback(() => {
    setRawSelected([])
    setSelectionError(null)
  }, [])

  const selectedTimes = useMemo(
    () => selectedSlots.map((s) => s.start_time),
    [selectedSlots],
  )
  const totalAmount = useMemo(() => calculateSlotsTotal(selectedSlots), [selectedSlots])
  const timeRange = useMemo(() => formatSlotRange(selectedSlots), [selectedSlots])

  return {
    selectedSlots,
    selectedTimes,
    highlightedTimes,
    totalAmount,
    timeRange,
    selectionError,
    toggleSlot,
    clearSelection,
  }
}
