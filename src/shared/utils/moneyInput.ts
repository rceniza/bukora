export function parsePHPAmountInput(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null

  const amountMinor = Number(normalized) * 100
  return Number.isSafeInteger(amountMinor) ? amountMinor : null
}
