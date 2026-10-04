import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import * as z from 'zod'

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date')

export function check<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.issues
      .map(issue => `${issue.path.join('.') || 'input'}: ${issue.message}`)
      .join('; ')
    throw new HTTPException(400, { message })
  }
  return result.data
}

export async function jsonBody<T extends z.ZodType>(c: Context, schema: T): Promise<z.output<T>> {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' })
  }
  return check(schema, raw)
}

export function idParam(c: Context): number {
  return check(z.coerce.number().int().positive(), c.req.param('id'))
}
