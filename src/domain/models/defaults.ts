import type { AppSettings } from './index'
import type { PricingRates } from '../services/bookingQuote'

export const DEFAULT_APP_SETTINGS: Readonly<AppSettings> = Object.freeze({
  displayName: 'Bukora',
  propertyName: 'Cenere Beach House',
  nightUseAmountMinor: 590000,
  additionalRoomAmountMinor: 180000,
  videokeRentalAmountMinor: 80000,
  confirmationDepositAmountMinor: 100000,
  currency: 'PHP',
})

export const DEFAULT_PRICING_RATES: Readonly<PricingRates> = Object.freeze({
  nightUseAmountMinor: DEFAULT_APP_SETTINGS.nightUseAmountMinor,
  additionalRoomAmountMinor: DEFAULT_APP_SETTINGS.additionalRoomAmountMinor,
  videokeRentalAmountMinor: DEFAULT_APP_SETTINGS.videokeRentalAmountMinor,
})
