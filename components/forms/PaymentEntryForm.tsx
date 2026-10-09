import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Pressable, Text, View } from 'react-native'
import { CalendarDateField } from './CalendarDateField'
import { AppTextField } from '../ui/AppTextField'
import { ErrorState } from '../ui/ErrorState'
import { PrimaryButton } from '../ui/PrimaryButton'
import { SurfaceCard } from '../ui/SurfaceCard'
import { PaymentService } from '../../src/application/services/PaymentService'
import { bookingRepository } from '../../src/data/repositories/bookingRepository'
import type { BookingAggregate } from '../../src/domain/ports/BookingRepository'
import type { BookingId, PaymentKind } from '../../src/domain/models'
import { parsePHPAmountInput } from '../../src/shared/utils/moneyInput'

const METHODS = ['Cash', 'GCash', 'Maya', 'Bank transfer', 'Other']

interface PaymentEntryFormProps {
  bookingId: BookingId
  bookingName?: string
  onRecorded?: (record: BookingAggregate) => void
}

export function PaymentEntryForm({ bookingId, bookingName, onRecorded }: PaymentEntryFormProps) {
  const [kind, setKind] = useState<PaymentKind>('payment')
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [method, setMethod] = useState('Cash')
  const [customMethod, setCustomMethod] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const service = useMemo(() => new PaymentService(bookingRepository), [])

  async function submit() {
    const amountMinor = parsePHPAmountInput(amount)
    if (amountMinor === null || amountMinor <= 0) { setError('Enter an amount greater than zero.'); return }
    if (method === 'Other' && !customMethod.trim()) { setError('Enter the payment method.'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const record = await service.record(bookingId, {
        kind, amountMinor, paidAt, method: method === 'Other' ? customMethod : method,
        transactionReference: reference, notes,
      })
      setAmount(''); setReference(''); setNotes('')
      setSuccess(kind === 'refund' ? 'Refund recorded.' : 'Payment recorded.')
      onRecorded?.(record)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The entry could not be saved.') }
    finally { setSaving(false) }
  }

  return <SurfaceCard className="gap-4">
    <View className="gap-1"><Text className="text-lg font-semibold text-ink">{kind === 'refund' ? 'Record a refund' : 'Record a payment'}</Text>{bookingName ? <Text className="text-sm text-muted">For {bookingName}</Text> : null}</View>
    <View className="flex-row gap-2">{(['payment', 'refund'] as const).map((item) => <Pressable key={item} onPress={() => { setKind(item); setError('') }} accessibilityRole="button" accessibilityState={{ selected: kind === item }} className={`rounded-full px-4 py-2 ${kind === item ? 'bg-cenere-600' : 'bg-canvas'}`}><Text className={kind === item ? 'font-semibold text-white' : 'text-ink'}>{item === 'payment' ? 'Payment' : 'Refund'}</Text></Pressable>)}</View>
    <AppTextField label="Amount (PHP)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
    <CalendarDateField label="Payment date" value={paidAt} onChange={setPaidAt} />
    <Text className="text-sm font-medium text-ink">Payment method</Text>
    <View className="flex-row flex-wrap gap-2">{METHODS.map((item) => <Pressable key={item} onPress={() => setMethod(item)} accessibilityRole="button" accessibilityState={{ selected: method === item }} className={`rounded-full px-4 py-2 ${method === item ? 'bg-cenere-600' : 'bg-canvas'}`}><Text className={method === item ? 'font-semibold text-white' : 'text-ink'}>{item}</Text></Pressable>)}</View>
    {method === 'Other' ? <AppTextField label="Other payment method" value={customMethod} onChangeText={setCustomMethod} /> : null}
    <AppTextField label="Transaction number / reference (optional)" value={reference} onChangeText={setReference} />
    <AppTextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
    {error ? <ErrorState message={error} /> : null}{success ? <Text accessibilityRole="alert" className="text-sm font-medium text-cenere-700">{success}</Text> : null}
    <PrimaryButton label={saving ? 'Saving…' : kind === 'refund' ? 'Record refund' : 'Record payment'} onPress={() => void submit()} disabled={saving} />
  </SurfaceCard>
}
