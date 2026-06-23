const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface PaginationParams {
  skip: number
  limit: number
  page: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  totalPages: number
}

export function paginationParams(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query['page'] ?? '1'), 10) || 1)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(String(query['limit'] ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  )
  const skip = (page - 1) * limit
  return { skip, limit, page }
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}
