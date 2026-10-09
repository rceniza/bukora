import { relations, sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const bookings = sqliteTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    status: text('status', { enum: ['tentative', 'confirmed', 'completed', 'cancelled'] }).notNull().default('confirmed'),
    confirmationDepositAmountMinor: integer('confirmation_deposit_amount_minor').notNull().default(0),
    guestName: text('guest_name').notNull(),
    address: text('address'),
    cellphone: text('cellphone').notNull(),
    email: text('email'),
    pax: integer('pax').notNull().default(0),
    checkInDate: text('check_in_date').notNull(),
    checkOutDate: text('check_out_date').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    cancelledAt: text('cancelled_at'),
  },
  (table) => [
    check('bookings_status_check', sql`${table.status} in ('tentative', 'confirmed', 'completed', 'cancelled')`),
    check('bookings_pax_nonnegative_check', sql`${table.pax} >= 0`),
    check('bookings_confirmation_deposit_nonnegative_check', sql`${table.confirmationDepositAmountMinor} >= 0`),
    check('bookings_date_range_check', sql`${table.checkOutDate} > ${table.checkInDate}`),
    index('bookings_status_checkin_idx').on(table.status, table.checkInDate),
    index('bookings_guest_name_idx').on(table.guestName),
  ],
)

export const bookingLineItems = sqliteTable(
  'booking_line_items',
  {
    id: text('id').primaryKey(),
    bookingId: text('booking_id').notNull().references(() => bookings.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    kind: text('kind', { enum: ['base_package', 'included_room', 'additional_room', 'videoke', 'custom_charge', 'discount'] }).notNull(),
    description: text('description').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitAmountMinor: integer('unit_amount_minor').notNull(),
    totalAmountMinor: integer('total_amount_minor').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    check('booking_line_items_kind_check', sql`${table.kind} in ('base_package', 'included_room', 'additional_room', 'videoke', 'custom_charge', 'discount')`),
    check('booking_line_items_quantity_positive_check', sql`${table.quantity} > 0`),
    check('booking_line_items_total_consistency_check', sql`${table.totalAmountMinor} = ${table.unitAmountMinor} * ${table.quantity}`),
    check('booking_line_items_money_nonnegative_check', sql`${table.kind} = 'discount' or ${table.unitAmountMinor} >= 0`),
    check('booking_line_items_discount_nonpositive_check', sql`${table.kind} != 'discount' or ${table.unitAmountMinor} <= 0`),
    index('booking_line_items_booking_idx').on(table.bookingId, table.createdAt),
  ],
)

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    bookingId: text('booking_id').notNull().references(() => bookings.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    kind: text('kind', { enum: ['payment', 'refund'] }).notNull(),
    amountMinor: integer('amount_minor').notNull(),
    paidAt: text('paid_at').notNull(),
    method: text('method'),
    transactionReference: text('transaction_reference'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    check('payments_kind_check', sql`${table.kind} in ('payment', 'refund')`),
    check('payments_amount_positive_check', sql`${table.amountMinor} > 0`),
    index('payments_booking_paid_at_idx').on(table.bookingId, table.paidAt),
  ],
)

export const bookingActivity = sqliteTable(
  'booking_activity',
  {
    id: text('id').primaryKey(),
    bookingId: text('booking_id').notNull().references(() => bookings.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    eventType: text('event_type').notNull(),
    summary: text('summary').notNull(),
    detailsJson: text('details_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('booking_activity_booking_created_idx').on(table.bookingId, table.createdAt)],
)

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const bookingRelations = relations(bookings, ({ many }) => ({
  lineItems: many(bookingLineItems),
  payments: many(payments),
  activity: many(bookingActivity),
}))
