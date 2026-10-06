import { z } from 'zod'
import { isDateRangeValid, isValidISODate } from '../../shared/utils/date'

const optionalText = z.string().trim().optional().transform((value) => value || null)

export const guestDetailsSchema = z.object({
  guestName: z.string().trim().min(1, 'Enter the guest name.').max(120),
  address: optionalText,
  cellphone: z.string().trim().min(7, 'Enter a valid cellphone number.').max(24),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')])
    .optional()
    .transform((value) => value || null),
  pax: z.number().int('Pax must be a whole number.').nonnegative('Pax cannot be negative.').nullable().optional(),
})

export const bookingFormSchema = guestDetailsSchema.extend({
  checkInDate: z.string().refine(isValidISODate, 'Choose a valid check-in date.'),
  checkOutDate: z.string().refine(isValidISODate, 'Choose a valid check-out date.'),
  notes: optionalText,
}).superRefine((booking, context) => {
  if (isValidISODate(booking.checkInDate)
    && isValidISODate(booking.checkOutDate)
    && !isDateRangeValid(booking.checkInDate, booking.checkOutDate)) {
    context.addIssue({
      code: 'custom',
      path: ['checkOutDate'],
      message: 'Check-out must be after check-in.',
    })
  }
})

export const bookingLineItemSchema = z.object({
  kind: z.enum(['base_package', 'included_room', 'additional_room', 'videoke', 'custom_charge', 'discount']),
  description: z.string().trim().min(1, 'Add a description.').max(160),
  quantity: z.number().int().positive(),
  unitAmountMinor: z.number().int(),
}).superRefine((item, context) => {
  if (item.kind === 'discount' && item.unitAmountMinor > 0) {
    context.addIssue({ code: 'custom', path: ['unitAmountMinor'], message: 'Discount amounts must be negative.' })
  }
  if (item.kind !== 'discount' && item.unitAmountMinor < 0) {
    context.addIssue({ code: 'custom', path: ['unitAmountMinor'], message: 'Charge amounts cannot be negative.' })
  }
})

export const paymentEntrySchema = z.object({
  kind: z.enum(['payment', 'refund']),
  amountMinor: z.number().int().positive('Enter an amount greater than zero.'),
  paidAt: z.string().refine(isValidISODate, 'Choose a valid payment date.'),
  method: z.string().trim().min(1, 'Choose or enter a payment method.').max(48),
  transactionReference: optionalText,
  notes: optionalText,
})

export type GuestDetailsInput = z.input<typeof guestDetailsSchema>
export type BookingFormInput = z.input<typeof bookingFormSchema>
export type BookingFormData = z.output<typeof bookingFormSchema>
