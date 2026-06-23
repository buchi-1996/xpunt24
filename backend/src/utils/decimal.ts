import { Types } from 'mongoose'
import { AppError } from './AppError'

/**
 * Recursively converts Mongoose Decimal128 values to strings on lean() results.
 * Prevents { $numberDecimal: "100" } from reaching clients.
 */
export function serializeDecimal(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj

  if (obj instanceof Types.Decimal128) {
    return obj.toString()
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
