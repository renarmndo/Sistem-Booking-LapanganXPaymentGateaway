import axios from 'axios'

export interface ApiFieldError {
  field: string
  message: string
}

interface ApiErrorPayload {
  message?: unknown
  errors?: unknown
}

export function getErrorMessage(
  err: unknown,
  fallback = 'Terjadi kesalahan. Silakan coba lagi.',
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorPayload | undefined
    if (data && typeof data.message === 'string' && data.message.trim() !== '') {
      return data.message
    }
    if (err.code === 'ECONNABORTED') {
      return 'Koneksi timeout. Silakan coba lagi.'
    }
    if (!err.response) {
      return 'Tidak dapat terhubung ke server.'
    }
  }

  if (err instanceof Error && err.message.trim() !== '') {
    return err.message
  }

  if (typeof err === 'string' && err.trim() !== '') {
    return err
  }

  return fallback
}

export function getFieldErrors(err: unknown): Record<string, string> {
  if (!axios.isAxiosError(err)) {
    return {}
  }

  const data = err.response?.data as ApiErrorPayload | undefined
  if (!data || !Array.isArray(data.errors)) {
    return {}
  }

  const result: Record<string, string> = {}
  for (const item of data.errors) {
    if (
      item &&
      typeof item === 'object' &&
      'field' in item &&
      'message' in item &&
      typeof item.field === 'string' &&
      typeof item.message === 'string'
    ) {
      result[item.field] = item.message
    }
  }
  return result
}
