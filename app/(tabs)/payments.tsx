import { useCallback, useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PaymentEntryForm } from '../../components/forms/PaymentEntryForm'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { SurfaceCard } from '../../components/ui/SurfaceCard'
import { bookingRepository } from '../../src/data/repositories/bookingRepository'
import type { BookingAggregate } from '../../src/domain/ports/BookingRepository'
import { formatDisplayDate } from '../../src/shared/utils/date'
import { formatPHPAmount } from '../../src/shared/utils/money'
import { FormScrollView } from '../../components/forms/FormScrollView'

export default function PaymentsScreen() {
  const { bookingId: requestedId } = useLocalSearchParams<{ bookingId?: string }>()
  const router = useRouter()
  const [records, setRecords] = useState<BookingAggregate[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  return <SafeAreaView className="flex-1 bg-canvas"><FormScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
    <View><Text className="text-sm font-medium uppercase text-cenere-700">Money received</Text><Text className="mt-1 text-3xl font-bold text-ink">Payments</Text></View>
    {error ? <Text accessibilityRole="alert" className="text-sm text-red-700">{error}</Text> : null}
    <SurfaceCard className="gap-4"><Text className="text-lg font-semibold text-ink">Choose a booking</Text>
      <Text className="text-sm font-medium text-ink">Booking</Text>
      {records.length === 0 ? <EmptyState title="No bookings to pay" message="Add a booking before recording a payment." /> : <View className="gap-2">{records.map(({ booking }) => <Pressable key={booking.id} onPress={() => setSelectedId(booking.id)} accessibilityRole="button" accessibilityState={{ selected: selectedId === booking.id }} className={`rounded-2xl border p-3 ${selectedId === booking.id ? 'border-cenere-600 bg-cenere-50' : 'border-line bg-white'}`}><Text className="font-semibold text-ink">{booking.guestName}</Text><Text className="mt-1 text-xs text-muted">{formatDisplayDate(booking.checkInDate)} · {booking.status}</Text></Pressable>)}</View>}
    </SurfaceCard>
    {selected ? <PaymentEntryForm key={selected.booking.id} bookingId={selected.booking.id} bookingName={selected.booking.guestName} onRecorded={() => void load()} /> : null}
    <SurfaceCard className="gap-3"><View className="flex-row items-center justify-between"><Text className="text-lg font-semibold text-ink">Payment history</Text><Text className="text-sm font-semibold text-cenere-700">Net {formatPHPAmount(netTotal)}</Text></View>
      {loading ? <LoadingState message="Loading payment history" /> : entries.length === 0 ? <EmptyState title="No payments recorded" message="Payments and refunds will appear here with their booking and transaction references." /> : entries.map(({ booking, payment }) => <Pressable key={payment.id} onPress={() => router.push(`/booking/${booking.id}`)} accessibilityRole="button"><View className="flex-row items-center justify-between gap-3 border-b border-line py-3"><View className="flex-1 gap-1"><Text className="text-sm font-semibold text-ink">{booking.guestName} · {payment.kind}</Text><Text className="text-xs text-muted">{formatDisplayDate(payment.paidAt)} · {payment.method}</Text>{payment.transactionReference ? <Text className="text-xs text-muted">Ref {payment.transactionReference}</Text> : null}</View><Text className={`text-sm font-semibold ${payment.kind === 'refund' ? 'text-amber-700' : 'text-cenere-700'}`}>{payment.kind === 'refund' ? '−' : '+'}{formatPHPAmount(payment.amountMinor)}</Text></View></Pressable>)}
    </SurfaceCard>
  </FormScrollView></SafeAreaView>
}
