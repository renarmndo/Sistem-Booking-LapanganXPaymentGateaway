export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  fields: {
    all: ['fields'] as const,
    list: (params?: Record<string, unknown>) => ['fields', 'list', params ?? {}] as const,
    detail: (id: number | string) => ['fields', 'detail', id] as const,
    availability: (id: number | string, date: string) =>
      ['fields', 'availability', id, date] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    myList: (params?: Record<string, unknown>) => ['bookings', 'me', params ?? {}] as const,
    detail: (id: number | string) => ['bookings', 'detail', id] as const,
  },
  admin: {
    summary: (params?: Record<string, unknown>) => ['admin', 'summary', params ?? {}] as const,
    fields: ['admin', 'fields'] as const,
    bookings: (params?: Record<string, unknown>) => ['admin', 'bookings', params ?? {}] as const,
    users: (params?: Record<string, unknown>) => ['admin', 'users', params ?? {}] as const,
  },
  owner: {
    summary: (params?: Record<string, unknown>) => ['owner', 'summary', params ?? {}] as const,
    bookings: (params?: Record<string, unknown>) => ['owner', 'bookings', params ?? {}] as const,
  },
} as const
