import { z } from 'zod'
import { DEFAULT_PRICING_RATES } from '../models/defaults'
import type { BookingLineItemKind } from '../models'

export interface PricingRates {
  nightUseAmountMinor: number
  additionalRoomAmountMinor: number
  videokeRentalAmountMinor: number
}

const customItemSchema = z.object({
  kind: z.enum(['custom_charge', 'discount']),
  description: z.string().trim().min(1, 'Add a description.').max(160),
  quantity: z.number().int().positive(),
  amountMinor: z.number().int().positive(),
})

export const bookingQuoteOptionsSchema = z.object({
  includeSecondRoom: z.boolean().default(false),
  rentVideokeWithOneRoom: z.boolean().default(false),
  customItems: z.array(customItemSchema).default([]),
}).superRefine((options, context) => {
  if (options.includeSecondRoom && options.rentVideokeWithOneRoom) {
    context.addIssue({
      code: 'custom',
      path: ['rentVideokeWithOneRoom'],
      message: 'Videoke is included with the second room.',
    })
  }
})

export type BookingQuoteOptions = z.input<typeof bookingQuoteOptionsSchema>
export type BookingQuoteLineItem = {
  kind: BookingLineItemKind
  description: string
  quantity: number
  unitAmountMinor: number
  totalAmountMinor: number
}

export interface BookingQuote {
  lineItems: BookingQuoteLineItem[]
  totalAmountMinor: number
}

function lineItem(
  kind: BookingLineItemKind,
  description: string,
  unitAmountMinor: number,
  quantity = 1,
): BookingQuoteLineItem {
  return { kind, description, quantity, unitAmountMinor, totalAmountMinor: unitAmountMinor * quantity }
}

export function calculateBookingQuote(
  input: BookingQuoteOptions,
  rates: PricingRates = DEFAULT_PRICING_RATES,
): BookingQuote {
  const options = bookingQuoteOptionsSchema.parse(input)
  for (const amount of Object.values(rates)) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new RangeError('Pricing rates must be nonnegative safe integers in minor currency units.')
    }
  }

  const lineItems: BookingQuoteLineItem[] = [
    lineItem('base_package', 'Night use', rates.nightUseAmountMinor),
    lineItem('included_room', 'One room included', 0),
  ]

  if (options.includeSecondRoom) {
    lineItems.push(lineItem('additional_room', 'Second room', rates.additionalRoomAmountMinor))
    lineItems.push(lineItem('videoke', 'Videoke included with second room', 0))
  } else if (options.rentVideokeWithOneRoom) {
    lineItems.push(lineItem('videoke', 'Videoke rental', rates.videokeRentalAmountMinor))
  }

  for (const item of options.customItems) {
    const signedAmount = item.kind === 'discount' ? -item.amountMinor : item.amountMinor
    lineItems.push(lineItem(item.kind, item.description, signedAmount, item.quantity))
  }

  const totalAmountMinor = lineItems.reduce((total, item) => total + item.totalAmountMinor, 0)
  if (!Number.isSafeInteger(totalAmountMinor) || totalAmountMinor < 0) {
    throw new RangeError('The booking total must be a nonnegative safe integer.')
  }

  return { lineItems, totalAmountMinor }
}
