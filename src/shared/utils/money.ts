export function formatPHPAmount(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Amount must be a safe integer in minor currency units.')
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100)
}
