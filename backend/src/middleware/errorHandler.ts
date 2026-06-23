import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  code?: string
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500
  const requestId = req.headers['x-request-id']

  if (statusCode >= 500) {
    console.error({
      message: err.message,
      stack: err.stack,
      requestId,
      method: req.method,
      url: req.url,
    })
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : err.message,
    ...(err.code ? { code: err.code } : {}),
    requestId,
  })
}
