const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const err = new Error((body as { error?: string }).error ?? res.statusText) as Error & {
      status: number
    }
    err.status = res.status
    throw err
  }

  return res.json() as Promise<T>
}

function get<T>(path: string) {
  return request<T>(path)
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
}

function patch<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
}

function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' })
}

export const api = {
  auth: {
    me: () => get<{ user: { _id: string; name: string; email: string; image?: string; role: string } }>('/auth/me'),
    logout: () => post<void>('/auth/logout'),
  },

  wallet: {
    balance: () => get<{ data: { balance: string; lockedBalance: string; currency: string } }>('/wallet/balance'),
    transactions: (page?: number) =>
      get<{ data: unknown[]; total: number; page: number; totalPages: number }>(
        `/wallet/transactions${page ? `?page=${page}` : ''}`,
      ),
    createDeposit: (body: { amount: number; currency?: string }) =>
      post<{
        data: {
          depositId: string
          address: string
          network: string
          currency: string
          amount: string
          expiresAt: string
          providerReference: string
        }
      }>('/wallet/deposits', body),
    getDeposit: (id: string) =>
      get<{ data: { status: string; address: string; requestedAmount: string; receivedAmount?: string } }>(
        `/wallet/deposits/${id}`,
      ),
    withdraw: (body: { amount: number; currency?: string; destinationAddress: string }) =>
      post<{ data: WithdrawalItem }>('/wallet/withdraw', body),
    listWithdrawals: (page?: number) =>
      get<{ data: WithdrawalItem[]; total: number; page: number; totalPages: number }>(
        `/wallet/withdrawals${page ? `?page=${page}` : ''}`,
      ),
  },

  fixtures: {
    list: (date: string, leagueId?: string) =>
      get<{ data: unknown[] }>(`/fixtures?date=${date}${leagueId ? `&leagueId=${leagueId}` : ''}`),
    get: (id: string) => get<{ data: unknown }>(`/fixtures/${id}`),
    live: (id: string) => get<{ data: unknown }>(`/fixtures/${id}/live`),
    leagues: () => get<{ data: unknown[] }>('/fixtures/leagues'),
  },

  challenges: {
    list: (params?: Record<string, string | number | undefined>) => {
      const qs = params
        ? '?' + new URLSearchParams(
            Object.fromEntries(
              Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
            ),
          ).toString()
        : ''
      return get<{ data: unknown[]; total: number; page: number; totalPages: number }>(
        `/challenges${qs}`,
      )
    },
    create: (body: unknown) => post<{ data: unknown }>('/challenges', body),
    get: (id: string) => get<{ data: unknown }>(`/challenges/${id}`),
    accept: (id: string) => post<{ data: unknown }>(`/challenges/${id}/accept`),
    cancel: (id: string) => del<{ success: boolean }>(`/challenges/${id}`),
    mine: (params?: Record<string, string | number | undefined>) => {
      const qs = params
        ? '?' + new URLSearchParams(
            Object.fromEntries(
              Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
            ),
          ).toString()
        : ''
      return get<{ data: unknown[]; total: number; page: number; totalPages: number }>(
        `/challenges/me${qs}`,
      )
    },
  },

  users: {
    get: (id: string) => get<{ data: unknown }>(`/users/${id}`),
    updateMe: (body: { name?: string; image?: string }) => patch<{ data: unknown }>('/users/me', body),
    stats: (id: string) => get<{ data: unknown }>(`/users/${id}/stats`),
    settings: () => get<{ data: unknown }>('/users/me/settings'),
    updateSettings: (body: unknown) => patch<{ data: unknown }>('/users/me/settings', body),
    follow: (id: string) => post<{ data: unknown }>(`/users/${id}/follow`),
    unfollow: (id: string) => del<{ success: boolean }>(`/users/${id}/follow`),
  },

  notifications: {
    list: (page?: number) =>
      get<{ data: NotificationItem[]; total: number; page: number; totalPages: number }>(
        `/notifications${page ? `?page=${page}` : ''}`,
      ),
    markRead: (id: string) => patch<{ data: NotificationItem }>(`/notifications/${id}/read`),
    markAllRead: () => patch<{ success: boolean }>('/notifications/read-all'),
  },
}

export interface NotificationItem {
  _id: string
  userId: string
  type: string
  title: string
  body: string
  read: boolean
  data?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type WithdrawalStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED'

export interface WithdrawalItem {
  _id: string
  amount: string
  currency: string
  status: WithdrawalStatus
  destinationAddress: string
  txHash?: string
  rejectionReason?: string
  processedAt?: string
  createdAt: string
  updatedAt: string
}
