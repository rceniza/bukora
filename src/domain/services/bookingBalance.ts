import type { BookingLineItem, BookingPayment } from '../models'

export function calculateBookingTotalMinor(lineItems: BookingLineItem[]): number {
  return lineItems.reduce((total, item) => total + item.totalAmountMinor, 0)
}

export function calculateNetPaymentsMinor(payments: BookingPayment[]): number {
  return payments.reduce((net, payment) => net + (payment.kind === 'refund' ? -payment.amountMinor : payment.amountMinor), 0)
}

export function calculateBalanceDueMinor(lineItems: BookingLineItem[], payments: BookingPayment[]): number {
  return calculateBookingTotalMinor(lineItems) - calculateNetPaymentsMinor(payments)
}
