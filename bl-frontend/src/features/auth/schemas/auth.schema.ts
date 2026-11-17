import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
})

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter'),
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .max(254, 'Email terlalu panjang'),
  phone: z
    .string()
    .trim()
    .min(8, 'Nomor HP minimal 8 digit')
    .max(20, 'Nomor HP maksimal 20 karakter')
    .regex(/^[0-9+\-\s]+$/, 'Nomor HP hanya boleh berisi angka'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter')
    .max(72, 'Kata sandi maksimal 72 karakter'),
})

export const verifyOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Kode OTP harus 6 digit angka'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  tone: 'danger' | 'warning' | 'info' | 'success'
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Belum diisi', tone: 'danger' }
  }

  let points = 0
  if (password.length >= 8) points += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1
  if (/\d/.test(password)) points += 1
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) points += 1

  if (points <= 1) {
    return { score: 1, label: 'Lemah', tone: 'danger' }
  }
  if (points === 2) {
    return { score: 2, label: 'Cukup', tone: 'warning' }
  }
  if (points === 3) {
    return { score: 3, label: 'Kuat', tone: 'info' }
  }
  return { score: 4, label: 'Sangat Kuat', tone: 'success' }
}
