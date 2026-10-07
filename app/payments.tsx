import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { format } from 'date-fns'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CalendarDateField } from '../components/forms/CalendarDateField'
import { AppTextField } from '../components/ui/AppTextField'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { PaymentService } from '../src/application/services/PaymentService'
import { bookingRepository } from '../src/data/repositories/bookingRepository'
import type { BookingAggregate } from '../src/domain/ports/BookingRepository'
import type { PaymentKind } from '../src/domain/models'
import { formatDisplayDate } from '../src/shared/utils/date'
import { formatPHPAmount } from '../src/shared/utils/money'
import { parsePHPAmountInput } from '../src/shared/utils/moneyInput'

const METHODS = ['Cash', 'GCash', 'Maya', 'Bank transfer', 'Other']

export default function PaymentsScreen() {
  const { bookingId: requestedId } = useLocalSearchParams<{ bookingId?: string }>()
  const router = useRouter()
  const [records, setRecords] = useState<BookingAggregate[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [kind, setKind] = useState<PaymentKind>('payment')
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [method, setMethod] = useState('Cash')
  const [customMethod, setCustomMethod] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const service = useMemo(() => new PaymentService(bookingRepository), [])
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await bookingRepository.listAll()
      setRecords(data)
      setSelectedId((current) => requestedId && data.some(({ booking }) => booking.id === requestedId)
        ? requestedId : current && data.some(({ booking }) => booking.id === current) ? current : data[0]?.booking.id ?? '')
      setError('')
    } catch { setError('Payment records could not be loaded from this device.') }
    finally { setLoading(false) }
  }, [requestedId])
  useEffect(() => { void load() }, [load])

  const selected = records.find(({ booking }) => booking.id === selectedId)
  const entries = records.flatMap(({ booking, payments }) => payments.map((payment) => ({ booking, payment })))
    .sort((a, b) => b.payment.paidAt.localeCompare(a.payment.paidAt) || b.payment.createdAt.localeCompare(a.payment.createdAt))
  const netTotal = entries.reduce((total, { payment }) => total + (payment.kind === 'refund' ? -payment.amountMinor : payment.amountMinor), 0)

  async function submit() {
    if (!selected) { setError('Choose a booking first.'); return }
    const amountMinor = parsePHPAmountInput(amount)
    if (amountMinor === null || amountMinor <= 0) { setError('Enter an amount greater than zero.'); return }
    if (method === 'Other' && !customMethod.trim()) { setError('Enter the payment method.'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      await service.record(selected.booking.id, {
        kind, amountMinor, paidAt, method: method === 'Other' ? customMethod : method,
        transactionReference: reference, notes,
      })
      setAmount(''); setReference(''); setNotes('')
      setSuccess(kind === 'refund' ? 'Refund recorded and added to the booking history.' : 'Payment recorded and added to the booking history.')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The entry could not be saved.') }
    finally { setSaving(false) }
  }

  return <SafeAreaView className="flex-1 bg-canvas"><ScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
    <Pressable onPress={() => router.back()} accessibilityRole="button"><Text className="font-semibold text-cenere-700">‹ Back</Text></Pressable>
    <View><Text className="text-sm font-medium uppercase text-cenere-700">Money received</Text><Text className="mt-1 text-3xl font-bold text-ink">Payments</Text></View>
    <SurfaceCard className="gap-4"><Text className="text-lg font-semibold text-ink">Record a payment</Text>
      <View className="flex-row gap-2">{(['payment', 'refund'] as const).map((item) => <Pressable key={item} onPress={() => setKind(item)} accessibilityRole="button" accessibilityState={{ selected: kind === item }} className={`rounded-full px-4 py-2 ${kind === item ? 'bg-cenere-600' : 'bg-canvas'}`}><Text className={kind === item ? 'font-semibold text-white' : 'text-ink'}>{item === 'payment' ? 'Payment' : 'Refund'}</Text></Pressable>)}</View>
      <Text className="text-sm font-medium text-ink">Booking</Text>
      {records.length === 0 ? <EmptyState title="No bookings to pay" message="Add a booking before recording a payment." /> : <View className="gap-2">{records.map(({ booking }) => <Pressable key={booking.id} onPress={() => setSelectedId(booking.id)} accessibilityRole="button" accessibilityState={{ selected: selectedId === booking.id }} className={`rounded-2xl border p-3 ${selectedId === booking.id ? 'border-cenere-600 bg-cenere-50' : 'border-line bg-white'}`}><Text className="font-semibold text-ink">{booking.guestName}</Text><Text className="mt-1 text-xs text-muted">{formatDisplayDate(booking.checkInDate)} · {booking.status}</Text></Pressable>)}</View>}
      <AppTextField label="Amount (PHP)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <CalendarDateField label="Payment date" value={paidAt} onChange={setPaidAt} />
      <Text className="text-sm font-medium text-ink">Payment method</Text>
      <View className="flex-row flex-wrap gap-2">{METHODS.map((item) => <Pressable key={item} onPress={() => setMethod(item)} accessibilityRole="button" accessibilityState={{ selected: method === item }} className={`rounded-full px-4 py-2 ${method === item ? 'bg-cenere-600' : 'bg-canvas'}`}><Text className={method === item ? 'font-semibold text-white' : 'text-ink'}>{item}</Text></Pressable>)}</View>
      {method === 'Other' ? <AppTextField label="Other payment method" value={customMethod} onChangeText={setCustomMethod} /> : null}
      <AppTextField label="Transaction number / reference (optional)" value={reference} onChangeText={setReference} />
      <AppTextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      {error ? <ErrorState message={error} /> : null}{success ? <Text accessibilityRole="alert" className="text-sm font-medium text-cenere-700">{success}</Text> : null}
      <PrimaryButton label={saving ? 'Saving…' : kind === 'refund' ? 'Record refund' : 'Record payment'} onPress={() => void submit()} disabled={saving || records.length === 0} />
    </SurfaceCard>
    <SurfaceCard className="gap-3"><View className="flex-row items-center justify-between"><Text className="text-lg font-semibold text-ink">Payment history</Text><Text className="text-sm font-semibold text-cenere-700">Net {formatPHPAmount(netTotal)}</Text></View>
      {loading ? <LoadingState message="Loading payment history" /> : entries.length === 0 ? <EmptyState title="No payments recorded" message="Payments and refunds will appear here with their booking and transaction references." /> : entries.map(({ booking, payment }) => <Pressable key={payment.id} onPress={() => router.push(`/booking/${booking.id}`)} accessibilityRole="button"><View className="flex-row items-center justify-between gap-3 border-b border-line py-3"><View className="flex-1 gap-1"><Text className="text-sm font-semibold text-ink">{booking.guestName} · {payment.kind}</Text><Text className="text-xs text-muted">{formatDisplayDate(payment.paidAt)} · {payment.method}</Text>{payment.transactionReference ? <Text className="text-xs text-muted">Ref {payment.transactionReference}</Text> : null}</View><Text className={`text-sm font-semibold ${payment.kind === 'refund' ? 'text-amber-700' : 'text-cenere-700'}`}>{payment.kind === 'refund' ? '−' : '+'}{formatPHPAmount(payment.amountMinor)}</Text></View></Pressable>)}
    </SurfaceCard>
  </ScrollView></SafeAreaView>
}
