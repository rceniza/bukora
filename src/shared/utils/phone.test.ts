import { getPhoneInputFromStoredValue, normalizePhoneNumber, PHONE_COUNTRIES } from './phone'

describe('phone number helpers', () => {
  it('provides names and calling codes for the complete supported country list', () => {
    expect(PHONE_COUNTRIES.length).toBeGreaterThanOrEqual(240)
    expect(PHONE_COUNTRIES).toEqual(expect.arrayContaining([
      expect.objectContaining({ countryCode: 'PH', name: 'Philippines', callingCode: '63' }),
      expect.objectContaining({ countryCode: 'US', callingCode: '1' }),
      expect.objectContaining({ countryCode: 'GB', callingCode: '44' }),
    ]))
  })

  it('normalizes national numbers using the selected country calling code', () => {
    expect(normalizePhoneNumber('0917 123 4567', 'PH')).toBe('+639171234567')
    expect(normalizePhoneNumber('(415) 555-2671', 'US')).toBe('+14155552671')
    expect(normalizePhoneNumber('07911 123456', 'GB')).toBe('+447911123456')
  })

  it('keeps an explicitly international number and restores stored numbers for editing', () => {
    expect(normalizePhoneNumber('+44 7911 123456', 'PH')).toBe('+447911123456')
    const restored = getPhoneInputFromStoredValue('+447911123456')
    expect(PHONE_COUNTRIES.find(({ countryCode }) => countryCode === restored.countryCode)?.callingCode).toBe('44')
    expect(restored.nationalNumber).toBe('07911 123456')
    expect(getPhoneInputFromStoredValue('09171234567')).toEqual({ countryCode: 'PH', nationalNumber: '09171234567' })
  })
})
