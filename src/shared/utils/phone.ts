import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'
import englishCountryNames from 'i18n-iso-countries/langs/en.json'

export type PhoneCountryCode = CountryCode

export interface PhoneCountryOption {
  countryCode: PhoneCountryCode
  name: string
  callingCode: string
}

const localizedNames = englishCountryNames.countries as Record<string, string | string[]>

export const PHONE_COUNTRIES: PhoneCountryOption[] = getCountries()
  .map((countryCode) => {
    const localizedName = localizedNames[countryCode]
    return {
      countryCode,
      name: (Array.isArray(localizedName) ? localizedName[0] : localizedName) ?? countryCode,
      callingCode: getCountryCallingCode(countryCode),
    }
  })
  .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)

export function normalizePhoneNumber(value: string, countryCode: PhoneCountryCode): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const parsed = parsePhoneNumberFromString(trimmed, countryCode)
  if (parsed) return parsed.number

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  if (trimmed.startsWith('+')) return `+${digits}`
  const nationalNumber = countryCode === 'PH' ? digits.replace(/^0/, '') : digits
  return `+${getCountryCallingCode(countryCode)}${nationalNumber}`
}

export function getPhoneInputFromStoredValue(value: string): { countryCode: PhoneCountryCode; nationalNumber: string } {
  const parsed = value.startsWith('+') ? parsePhoneNumberFromString(value) : undefined
  if (parsed?.country) {
    return { countryCode: parsed.country, nationalNumber: parsed.formatNational() }
  }
  return { countryCode: 'PH', nationalNumber: value }
}

export function getPhoneCountryFlag(countryCode: string): string {
  if (!/^[A-Z]{2}$/.test(countryCode)) return ''
  return Array.from(countryCode, (character) => String.fromCodePoint(127397 + character.charCodeAt(0))).join('')
}
