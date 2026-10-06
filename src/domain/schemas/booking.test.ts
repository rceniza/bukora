import { bookingFormSchema, bookingLineItemSchema, guestDetailsSchema, paymentEntrySchema } from './booking'

const validBooking = {
  guestName: '  Alex Santos  ',
  address: 'Baybay City',
  cellphone: '09171234567',
  email: '',
  pax: 8,
  checkInDate: '2026-06-12',
  checkOutDate: '2026-06-13',
  notes: '',
}

describe('booking schemas', () => {
  it('trims guest fields and normalizes optional blanks', () => {
    const result = guestDetailsSchema.safeParse(validBooking)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.guestName).toBe('Alex Santos')
      expect(result.data.address).toBe('Baybay City')
      expect(result.data.email).toBeNull()
    }
  })

  it('validates required guest details, email, pax, and the overnight date range', () => {
    expect(bookingFormSchema.safeParse(validBooking).success).toBe(true)
    expect(bookingFormSchema.safeParse({ ...validBooking, guestName: ' ' }).success).toBe(false)
    expect(bookingFormSchema.safeParse({ ...validBooking, email: 'bad-email' }).success).toBe(false)
    expect(bookingFormSchema.safeParse({ ...validBooking, pax: -1 }).success).toBe(false)
    const sameDay = bookingFormSchema.safeParse({ ...validBooking, checkOutDate: validBooking.checkInDate })
    expect(sameDay.success).toBe(false)
    if (!sameDay.success) {
      expect(sameDay.error.issues.some((issue) => issue.path[0] === 'checkOutDate')).toBe(true)
    }
  })

  it('validates line item descriptions and positive quantities', () => {
    expect(bookingLineItemSchema.safeParse({
      kind: 'custom_charge', description: 'Catering', quantity: 1, unitAmountMinor: 250000,
    }).success).toBe(true)
    expect(bookingLineItemSchema.safeParse({
      kind: 'discount', description: '', quantity: 1, unitAmountMinor: -50000,
    }).success).toBe(false)
    expect(bookingLineItemSchema.safeParse({
      kind: 'discount', description: 'Discount', quantity: 1, unitAmountMinor: -50000,
    }).success).toBe(true)
    expect(bookingLineItemSchema.safeParse({
      kind: 'discount', description: 'Discount', quantity: 1, unitAmountMinor: 50000,
    }).success).toBe(false)
  })

  it('validates payment entries and keeps the reference optional', () => {
    expect(paymentEntrySchema.safeParse({
      kind: 'payment', amountMinor: 200000, paidAt: '2026-06-01', method: 'GCash',
    }).success).toBe(true)
    expect(paymentEntrySchema.safeParse({
      kind: 'refund', amountMinor: 0, paidAt: '2026-06-01', method: 'Cash',
    }).success).toBe(false)
  })
})
