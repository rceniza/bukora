import { parsePHPAmountInput } from './moneyInput'

describe('parsePHPAmountInput', () => {
  it('converts up to two decimal places to integer minor units', () => {
    expect(parsePHPAmountInput('5,900')).toBeNull()
    expect(parsePHPAmountInput('5900')).toBe(590000)
    expect(parsePHPAmountInput('80.50')).toBe(8050)
    expect(parsePHPAmountInput('0')).toBe(0)
  })

  it('rejects signs, excessive decimal precision, and nonnumeric values', () => {
    expect(parsePHPAmountInput('-1')).toBeNull()
    expect(parsePHPAmountInput('1.001')).toBeNull()
    expect(parsePHPAmountInput('abc')).toBeNull()
  })
})
