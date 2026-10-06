export type UUID = string & { readonly __uuid: unique symbol }
export type BookingId = UUID
export type LineItemId = UUID
export type PaymentId = UUID
export type ActivityId = UUID

export type BookingStatus = 'tentative' | 'confirmed' | 'completed' | 'cancelled'

export interface Booking {
  id: BookingId
  status: BookingStatus
  guestName: string
  address: string | null
  cellphone: string
  email: string | null
  pax: number
  checkInDate: string
  checkOutDate: string
  notes: string | null
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
}

export type BookingLineItemKind =
  | 'base_package'
  | 'included_room'
  | 'additional_room'
  | 'videoke'
  | 'custom_charge'
  | 'discount'

export interface BookingLineItem {
  id: LineItemId
  bookingId: BookingId
  kind: BookingLineItemKind
  description: string
  quantity: number
  unitAmountMinor: number
  totalAmountMinor: number
  createdAt: string
}

export type PaymentKind = 'payment' | 'refund'

export interface BookingPayment {
  id: PaymentId
  bookingId: BookingId
  kind: PaymentKind
  amountMinor: number
  paidAt: string
  method: string | null
  transactionReference: string | null
  notes: string | null
  createdAt: string
}

export interface BookingActivity {
  id: ActivityId
  bookingId: BookingId
  eventType: string
  summary: string
  details: Record<string, unknown> | null
  createdAt: string
}

export interface AppSettings {
  displayName: string
  propertyName: string
  basePriceMinor: number
  secondRoomPriceMinor: number
  videokePriceMinor: number
  currency: 'PHP'
}
