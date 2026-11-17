import { z } from 'zod'

export const priceRuleSchema = z
  .object({
    day_type: z.enum(['weekday', 'weekend', 'holiday']),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam harus HH:MM'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam harus HH:MM'),
    price_per_slot: z.coerce.number().int().positive('Harga harus lebih dari 0'),
  })
  .refine((val) => val.start_time < val.end_time, {
    message: 'Jam selesai harus lebih besar dari jam mulai',
    path: ['end_time'],
  })

export const operatingHourSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    open_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam harus HH:MM'),
    close_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam harus HH:MM'),
    is_closed: z.boolean(),
  })
  .refine((val) => val.is_closed || val.open_time < val.close_time, {
    message: 'Jam tutup harus lebih besar dari jam buka',
    path: ['close_time'],
  })

export const fieldFormSchema = z.object({
  name: z.string().trim().min(2, 'Nama lapangan minimal 2 karakter').max(150),
  description: z.string().trim().optional().default(''),
  address: z.string().trim().min(3, 'Alamat wajib diisi').max(255),
  city: z.string().trim().min(2, 'Kota wajib diisi').max(100),
  surface_type: z.string().trim().min(2, 'Jenis permukaan wajib diisi').max(50),
  capacity: z.coerce.number().int().positive('Kapasitas minimal 1 pemain'),
  is_active: z.boolean().default(true),
  facility_ids: z.array(z.number().int().positive()).default([]),
  prices: z.array(priceRuleSchema).min(1, 'Minimal 1 aturan harga wajib diisi'),
  operating_hours: z.array(operatingHourSchema).length(7, 'Jam operasional harus 7 hari'),
})

export type FieldFormValues = z.infer<typeof fieldFormSchema>

export const facilityFormSchema = z.object({
  name: z.string().trim().min(2, 'Nama fasilitas minimal 2 karakter').max(100),
  icon: z.string().trim().min(1, 'Nama ikon wajib diisi').max(50),
})

export type FacilityFormValues = z.infer<typeof facilityFormSchema>
