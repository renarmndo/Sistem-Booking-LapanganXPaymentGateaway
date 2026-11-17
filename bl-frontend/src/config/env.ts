import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z
    .string()
    .trim()
    .min(1)
    .refine(
      (val) => val.startsWith('/') || /^https?:\/\/.+/.test(val),
      'VITE_API_URL harus berupa URL valid atau path relatif yang diawali /',
    )
    .default('/api/v1'),
  VITE_MIDTRANS_CLIENT_KEY: z.string().trim().default(''),
  VITE_MIDTRANS_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
})

const parsed = envSchema.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_MIDTRANS_CLIENT_KEY: import.meta.env.VITE_MIDTRANS_CLIENT_KEY,
  VITE_MIDTRANS_ENV: import.meta.env.VITE_MIDTRANS_ENV,
})

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ')
  throw new Error(`Konfigurasi environment frontend tidak valid: ${details}`)
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL,
  midtransClientKey: parsed.data.VITE_MIDTRANS_CLIENT_KEY,
  midtransEnv: parsed.data.VITE_MIDTRANS_ENV,
} as const
