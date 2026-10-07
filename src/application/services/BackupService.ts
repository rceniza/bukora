import { z } from 'zod'
import { appSettingsSchema } from './SettingsService'
import type { AppSettings, UUID } from '../../domain/models'
import type { BookingAggregate } from '../../domain/ports/BookingRepository'
import { isDateRangeValid, isValidISODate } from '../../shared/utils/date'
import { isUUID } from '../../shared/utils/uuid'

const uuidSchema = z.string().refine(isUUID, 'Expected a valid UUID.').transform((value) => value as UUID)
const bookingSchema = z.object({
  id: uuidSchema, status: z.enum(['tentative', 'confirmed', 'completed', 'cancelled']),
  guestName: z.string().min(1).max(120), address: z.string().nullable(), cellphone: z.string().min(7).max(24),
  email: z.string().email().nullable(), pax: z.number().int().nonnegative(),
  checkInDate: z.string().refine(isValidISODate), checkOutDate: z.string().refine(isValidISODate),
  notes: z.string().nullable(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(), cancelledAt: z.string().datetime().nullable(),
}).superRefine((booking, context) => {
  if (!isDateRangeValid(booking.checkInDate, booking.checkOutDate)) context.addIssue({ code: 'custom', path: ['checkOutDate'], message: 'Invalid date range.' })
  if ((booking.status === 'cancelled') !== (booking.cancelledAt !== null)) context.addIssue({ code: 'custom', path: ['cancelledAt'], message: 'Cancellation timestamp does not match booking status.' })
})
const lineItemSchema = z.object({
  id: uuidSchema, bookingId: uuidSchema, kind: z.enum(['base_package', 'included_room', 'additional_room', 'videoke', 'custom_charge', 'discount']),
  description: z.string().min(1).max(160), quantity: z.number().int().positive(),
  unitAmountMinor: z.number().int().safe(), totalAmountMinor: z.number().int().safe(), createdAt: z.string().datetime(),
}).superRefine((item, context) => {
  const expectedTotal = item.quantity * item.unitAmountMinor
  if (!Number.isSafeInteger(expectedTotal) || item.totalAmountMinor !== expectedTotal) {
    context.addIssue({ code: 'custom', path: ['totalAmountMinor'], message: 'Line item total does not match quantity and unit amount.' })
  }
  if (item.kind === 'discount' ? item.totalAmountMinor > 0 : item.totalAmountMinor < 0) {
    context.addIssue({ code: 'custom', path: ['totalAmountMinor'], message: 'Line item sign does not match its charge or discount type.' })
  }
})
const paymentSchema = z.object({
  id: uuidSchema, bookingId: uuidSchema, kind: z.enum(['payment', 'refund']), amountMinor: z.number().int().positive().safe(),
  paidAt: z.string().refine(isValidISODate), method: z.string().min(1).max(48).nullable(),
  transactionReference: z.string().nullable(), notes: z.string().nullable(), createdAt: z.string().datetime(),
})
const activitySchema = z.object({
  id: uuidSchema, bookingId: uuidSchema, eventType: z.string().min(1).max(80), summary: z.string().min(1).max(200),
  details: z.record(z.string(), z.unknown()).nullable(), createdAt: z.string().datetime(),
})
const aggregateSchema = z.object({
  booking: bookingSchema,
  lineItems: z.array(lineItemSchema),
  payments: z.array(paymentSchema),
  activity: z.array(activitySchema),
}).superRefine((aggregate, context) => {
  const id = aggregate.booking.id
  for (const [collection, items] of [['lineItems', aggregate.lineItems], ['payments', aggregate.payments], ['activity', aggregate.activity]] as const) {
    items.forEach((item, index) => {
      if (item.bookingId !== id) context.addIssue({ code: 'custom', path: [collection, index, 'bookingId'], message: 'Record belongs to a different booking.' })
    })
  }
  if (aggregate.activity.length === 0) context.addIssue({ code: 'custom', path: ['activity'], message: 'Booking history cannot be empty.' })
})

export const backupDocumentSchema = z.object({
  format: z.literal('bukora-backup'),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  settings: appSettingsSchema,
  bookings: z.array(aggregateSchema),
}).superRefine((document, context) => {
  const bookingIds = document.bookings.map(({ booking }) => booking.id)
  if (new Set(bookingIds).size !== bookingIds.length) context.addIssue({ code: 'custom', path: ['bookings'], message: 'Backup contains duplicate booking IDs.' })
  const recordIds = document.bookings.flatMap(({ booking, lineItems, payments, activity }) => [
    booking.id, ...lineItems.map(({ id }) => id), ...payments.map(({ id }) => id), ...activity.map(({ id }) => id),
  ])
  if (new Set(recordIds).size !== recordIds.length) context.addIssue({ code: 'custom', path: ['bookings'], message: 'Backup contains duplicate record IDs.' })
})

export type BackupDocument = z.output<typeof backupDocumentSchema>
export interface BackupSnapshot { settings: AppSettings; bookings: BookingAggregate[] }
export interface BackupStorage {
  load(): Promise<BackupSnapshot>
  replace(snapshot: BackupSnapshot): Promise<void>
}

export class BackupService {
  constructor(private readonly storage: BackupStorage, private readonly now: () => string = () => new Date().toISOString()) {}

  async export(): Promise<string> {
    const snapshot = await this.storage.load()
    return JSON.stringify(backupDocumentSchema.parse({ format: 'bukora-backup', version: 1, exportedAt: this.now(), ...snapshot }), null, 2)
  }

  parse(input: string): BackupDocument {
    let value: unknown
    try { value = JSON.parse(input) }
    catch { throw new Error('This file is not valid JSON.') }
    const parsed = backupDocumentSchema.safeParse(value)
    if (!parsed.success) {
      const version = typeof value === 'object' && value !== null && 'version' in value ? (value as { version?: unknown }).version : undefined
      if (version !== undefined && version !== 1) throw new Error(`Backup version ${String(version)} is not supported.`)
      throw new Error('This backup is invalid or incomplete. Your current records have not been changed.')
    }
    return parsed.data
  }

  async restore(document: BackupDocument): Promise<void> {
    const validated = backupDocumentSchema.parse(document)
    await this.storage.replace({ settings: validated.settings, bookings: validated.bookings as BookingAggregate[] })
  }
}
