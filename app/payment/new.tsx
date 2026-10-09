import { useCallback, useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PaymentEntryForm } from '../../components/forms/PaymentEntryForm'
import { BackButton } from '../../components/navigation/BackButton'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { FormScrollView } from '../../components/forms/FormScrollView'
import { bookingRepository } from '../../src/data/repositories/bookingRepository'
import type { BookingAggregate } from '../../src/domain/ports/BookingRepository'
import type { BookingId } from '../../src/domain/models'
import { isUUID } from '../../src/shared/utils/uuid'

export default function BookingPaymentRoute() {
  const { bookingId: requestedId } = useLocalSearchParams<{ bookingId?: string }>()
  const router = useRouter()
  const bookingId = isUUID(requestedId ?? '') ? requestedId as BookingId : null
  const [record, setRecord] = useState<BookingAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    if (!bookingId) { setError('This booking link is invalid.'); setLoading(false); return }
    try { setRecord(await bookingRepository.findById(bookingId)); setError('') }
    catch { setError('This booking could not be loaded from this device.') }
    finally { setLoading(false) }
  }, [bookingId])
  useEffect(() => { void load() }, [load])

  return <SafeAreaView className="flex-1 bg-canvas"><FormScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
    <View className="gap-3"><BackButton label="Booking" fallback={bookingId ? `/booking/${bookingId}` : '/booking'} /><Text className="text-3xl font-bold text-ink">Add payment</Text></View>
    {loading ? <LoadingState message="Loading booking" /> : record ? <PaymentEntryForm bookingId={record.booking.id} bookingName={record.booking.guestName} onRecorded={() => router.back()} /> : <ErrorState message={error || 'Booking was not found.'} onRetry={() => void load()} />}
  </FormScrollView></SafeAreaView>
}
