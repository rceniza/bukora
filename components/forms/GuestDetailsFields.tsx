import { AppTextField } from '../ui/AppTextField'
import { PhoneNumberField } from './PhoneNumberField'
import type { PhoneCountryCode } from '../../src/shared/utils/phone'

export interface GuestDetailsValues {
  guestName: string
  address: string
  cellphone: string
  email: string
  pax: string
}

interface GuestDetailsFieldsProps {
  values: GuestDetailsValues
  errors?: Partial<Record<keyof GuestDetailsValues, string>>
  onChange: (field: keyof GuestDetailsValues, value: string) => void
  phoneCountryCode: PhoneCountryCode
  onPhoneCountryCodeChange: (countryCode: PhoneCountryCode) => void
}

export function GuestDetailsFields({ values, errors = {}, onChange, phoneCountryCode, onPhoneCountryCodeChange }: GuestDetailsFieldsProps) {
  return (
    <>
      <AppTextField
        label="Guest name"
        value={values.guestName}
        onChangeText={(value) => onChange('guestName', value)}
        error={errors.guestName}
        autoCapitalize="words"
        autoComplete="name"
      />
      <PhoneNumberField
        value={values.cellphone}
        onChangeText={(value) => onChange('cellphone', value)}
        countryCode={phoneCountryCode}
        onCountryCodeChange={onPhoneCountryCodeChange}
        error={errors.cellphone}
      />
      <AppTextField
        label="Address"
        value={values.address}
        onChangeText={(value) => onChange('address', value)}
        error={errors.address}
        autoCapitalize="words"
      />
      <AppTextField
        label="Email (optional)"
        value={values.email}
        onChangeText={(value) => onChange('email', value)}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <AppTextField
        label="Number of guests (pax)"
        value={values.pax}
        onChangeText={(value) => onChange('pax', value)}
        error={errors.pax}
        helper="For your records only; pax does not affect the price."
        keyboardType="number-pad"
      />
    </>
  )
}
