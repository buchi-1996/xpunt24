import { Types } from 'mongoose'
import { AppError } from './AppError'

/**
 * Recursively converts Mongoose Decimal128 values to strings on lean() results.
 * Prevents { $numberDecimal: "100" } from reaching clients.
 */
export function serializeDecimal(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj

  // Decimal128 -> string ("100" not { $numberDecimal: "100" })
  if (obj instanceof Types.Decimal128) {
    return obj.toString()
  }

  // ObjectId -> hex string. Without this, the recursive object walk below treats an
  // ObjectId as a plain object, finds no enumerable own properties, and emits `{}`
  // — which serializes to JSON as `{}` and breaks React keys / equality checks.
  if (obj instanceof Types.ObjectId) {
    return obj.toString()
  }

  // Date -> ISO string. Same reasoning as ObjectId: the walk would otherwise destroy it.
  if (obj instanceof Date) {
    return obj.toISOString()
  }

  // Buffer / Uint8Array -> base64 (rarely surfaced, but safer than dehydrating to {})
  if (obj instanceof Uint8Array) {
    return Buffer.from(obj).toString('base64')
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimal)
  }

  if (typeof obj === 'object') {
    // Handle plain objects that may contain $numberDecimal (from lean())
    const record = obj as Record<string, unknown>
    if ('$numberDecimal' in record) {
      return String(record['$numberDecimal'])
    }
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(record)) {
      result[key] = serializeDecimal(record[key])
    }
    return result
  }

  return obj
}

/**
 * Parses a string or number into a Mongoose Decimal128.
 * Throws AppError with 400 if the value is not a valid number.
 */
export function toDecimal(val: string | number, field: string): Types.Decimal128 {
  const str = String(val).trim()
  if (str === '' || isNaN(Number(str))) {
    throw new AppError(`Invalid value for field "${field}": "${val}"`, 400, 'INVALID_DECIMAL')
  }
  return Types.Decimal128.fromString(str)
}
