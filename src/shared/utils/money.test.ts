import { formatPHPAmount } from './money'

describe('formatPHPAmount', () => {
  it('formats minor units as Philippine pesos', () => {
    expect(formatPHPAmount(590000)).toBe('₱5,900.00')
    expect(formatPHPAmount(-80000)).toBe('-₱800.00')
  })

  it('rejects values that cannot be represented safely as integer minor units', () => {
    expect(() => formatPHPAmount(12.5)).toThrow(RangeError)
    expect(() => formatPHPAmount(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError)
  })
})
