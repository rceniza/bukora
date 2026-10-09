import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Link, useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppTextField } from '../../components/ui/AppTextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { SurfaceCard } from '../../components/ui/SurfaceCard'
import { bookingRepository } from '../../src/data/repositories/bookingRepository'
import type { BookingAggregate } from '../../src/domain/ports/BookingRepository'
import { formatDisplayDate } from '../../src/shared/utils/date'
import { formatPHPAmount } from '../../src/shared/utils/money'
import { calculateBalanceDueMinor } from '../../src/domain/services/bookingBalance'
import { FormScrollView } from '../../components/forms/FormScrollView'

type Filter = 'upcoming' | 'all' | 'cancelled'

export default function BookingListScreen() {
  const router = useRouter()
  const [records, setRecords] = useState<BookingAggregate[]>([])
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try { setRecords(await bookingRepository.listAll()); setError(false) }
    catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const visible = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const normalized = query.trim().toLocaleLowerCase()
    return records.filter(({ booking }) => {
      const matchesFilter = filter === 'all' || (filter === 'cancelled'
        ? booking.status === 'cancelled'
        : booking.status !== 'cancelled' && booking.checkOutDate >= today)
      return matchesFilter && (!normalized || [booking.guestName, booking.cellphone, booking.email ?? '']
        .some((value) => value.toLocaleLowerCase().includes(normalized)))
    }).sort((a, b) => a.booking.checkInDate.localeCompare(b.booking.checkInDate))
  }, [filter, query, records])

  return <SafeAreaView className="flex-1 bg-canvas">
    <FormScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
      <View className="flex-row items-center justify-between"><View><Text className="text-sm font-medium uppercase text-cenere-700">Your ledger</Text><Text className="mt-1 text-3xl font-bold text-ink">Bookings</Text></View><Link href="/booking/new" asChild><PrimaryButton label="Add booking" /></Link></View>
      <View className="flex-row gap-2">
        {(['upcoming', 'all', 'cancelled'] as const).map((item) => <Pressable key={item} onPress={() => setFilter(item)} accessibilityRole="button" accessibilityState={{ selected: filter === item }} className={`rounded-full px-4 py-2 ${filter === item ? 'bg-cenere-600' : 'bg-white'}`}><Text className={filter === item ? 'font-semibold text-white' : 'text-ink'}>{item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}
        <Pressable onPress={() => router.push('/calendar')} className="ml-auto rounded-full border border-cenere-600 px-4 py-2" accessibilityRole="button"><Text className="font-semibold text-cenere-700">Calendar</Text></Pressable>
      </View>
      <AppTextField label="Search guest, phone, or email" value={query} onChangeText={setQuery} />
      {error ? <ErrorState message="Bookings could not be loaded from this device." onRetry={() => void load()} /> : loading ? <LoadingState message="Loading bookings" /> : visible.length === 0 ? <EmptyState title={records.length ? 'No matching bookings' : 'No bookings yet'} message="New stays you record will appear here and remain available offline." /> : visible.map(({ booking, lineItems, payments }) => {
        const balance = calculateBalanceDueMinor(lineItems, payments)
        return <Pressable key={booking.id} onPress={() => router.push(`/booking/${booking.id}`)} accessibilityRole="button" accessibilityLabel={`View booking for ${booking.guestName}`}>
          <SurfaceCard className="gap-2"><View className="flex-row items-center justify-between gap-2"><Text className="flex-1 text-base font-semibold text-ink">{booking.guestName}</Text><Text className={`text-xs font-semibold uppercase ${booking.status === 'cancelled' ? 'text-amber-700' : 'text-cenere-700'}`}>{booking.status}</Text></View><Text className="text-sm text-muted">{formatDisplayDate(booking.checkInDate)} – {formatDisplayDate(booking.checkOutDate)} · {booking.pax} pax</Text><View className="flex-row justify-between"><Text className="text-sm text-muted">{booking.cellphone}</Text><Text className="text-sm font-medium text-ink">Balance {formatPHPAmount(balance)}</Text></View></SurfaceCard>
        </Pressable>
      })}
    </FormScrollView>
  </SafeAreaView>
}
