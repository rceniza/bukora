import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppTextField } from '../../components/ui/AppTextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { SurfaceCard } from '../../components/ui/SurfaceCard'
import { bookingRepository } from '../../src/data/repositories/bookingRepository'
import type { BookingAggregate, BookingListCursor } from '../../src/domain/ports/BookingRepository'
import { formatDisplayDate } from '../../src/shared/utils/date'
import { formatPHPAmount } from '../../src/shared/utils/money'
import { calculateBalanceDueMinor } from '../../src/domain/services/bookingBalance'
import { FormScrollView } from '../../components/forms/FormScrollView'

type Filter = 'upcoming' | 'all' | 'cancelled'
const PAGE_SIZE = 20

export default function BookingListScreen() {
  const router = useRouter()
  const [records, setRecords] = useState<BookingAggregate[]>([])
  const [cursor, setCursor] = useState<BookingListCursor | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<'first' | 'more' | null>(null)
  const requestVersion = useRef(0)
  useEffect(() => {
    const timeout = setTimeout(() => setAppliedQuery(query), 250)
    return () => clearTimeout(timeout)
  }, [query])
  const loadFirstPage = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true)
    setError(null)
    setCursor(null)
    setHasMore(false)
    try {
      const page = await bookingRepository.listPage({ filter, query: appliedQuery, today: format(new Date(), 'yyyy-MM-dd'), limit: PAGE_SIZE })
      if (version !== requestVersion.current) return
      setRecords(page.records)
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch {
      if (version === requestVersion.current) setError('first')
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [appliedQuery, filter])
  useFocusEffect(useCallback(() => { void loadFirstPage() }, [loadFirstPage]))

  const loadNextPage = useCallback(async () => {
    if (!cursor || !hasMore || loading || loadingMore) return
    const version = requestVersion.current
    setLoadingMore(true)
    setError(null)
    try {
      const page = await bookingRepository.listPage({ filter, query: appliedQuery, today: format(new Date(), 'yyyy-MM-dd'), limit: PAGE_SIZE, cursor })
      if (version !== requestVersion.current) return
      setRecords((current) => {
        const existingIds = new Set(current.map(({ booking }) => booking.id))
        return [...current, ...page.records.filter(({ booking }) => !existingIds.has(booking.id))]
      })
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch {
      if (version === requestVersion.current) setError('more')
    } finally {
      if (version === requestVersion.current) setLoadingMore(false)
    }
  }, [appliedQuery, cursor, filter, hasMore, loading, loadingMore])
  const retryLoad = error === 'more' ? loadNextPage : loadFirstPage
  const emptyTitle = appliedQuery.trim()
    ? 'No matching bookings'
    : filter === 'upcoming' ? 'No upcoming bookings' : filter === 'cancelled' ? 'No cancelled bookings' : 'No bookings yet'

  return <SafeAreaView className="flex-1 bg-canvas">
    <FormScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
      <View className="flex-row items-center justify-between"><View><Text className="text-sm font-medium uppercase text-cenere-700">Your ledger</Text><Text className="mt-1 text-3xl font-bold text-ink">Bookings</Text></View><Link href="/booking/new" asChild><PrimaryButton label="Add booking" /></Link></View>
      <View className="flex-row gap-2">
        {(['upcoming', 'all', 'cancelled'] as const).map((item) => <Pressable key={item} onPress={() => setFilter(item)} accessibilityRole="button" accessibilityState={{ selected: filter === item }} className={`rounded-full px-4 py-2 ${filter === item ? 'bg-cenere-600' : 'bg-white'}`}><Text className={filter === item ? 'font-semibold text-white' : 'text-ink'}>{item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}
        <Pressable onPress={() => router.push('/calendar')} className="ml-auto rounded-full border border-cenere-600 px-4 py-2" accessibilityRole="button"><Text className="font-semibold text-cenere-700">Calendar</Text></Pressable>
      </View>
      <AppTextField label="Search guest, phone, or email" value={query} onChangeText={setQuery} />
      {error === 'first' ? <ErrorState message="Bookings could not be loaded from this device." onRetry={() => void retryLoad()} /> : loading ? <LoadingState message="Loading bookings" /> : records.length === 0 ? <EmptyState title={emptyTitle} message="New stays you record will appear here and remain available offline." /> : <>
        {records.map(({ booking, lineItems, payments }) => {
        const balance = calculateBalanceDueMinor(lineItems, payments)
        return <Pressable key={booking.id} onPress={() => router.push(`/booking/${booking.id}`)} accessibilityRole="button" accessibilityLabel={`View booking for ${booking.guestName}`}>
          <SurfaceCard className="gap-2"><View className="flex-row items-center justify-between gap-2"><Text className="flex-1 text-base font-semibold text-ink">{booking.guestName}</Text><Text className={`text-xs font-semibold uppercase ${booking.status === 'cancelled' || booking.status === 'tentative' ? 'text-amber-700' : 'text-cenere-700'}`}>{booking.status}</Text></View><Text className="text-sm text-muted">{formatDisplayDate(booking.checkInDate)} – {formatDisplayDate(booking.checkOutDate)} · {booking.pax} pax</Text><View className="flex-row justify-between"><Text className="text-sm text-muted">{booking.cellphone}</Text><Text className="text-sm font-medium text-ink">Balance {formatPHPAmount(balance)}</Text></View></SurfaceCard>
        </Pressable>
        })}
        {error === 'more' ? <ErrorState message="More bookings could not be loaded." onRetry={() => void retryLoad()} /> : null}
        {hasMore ? <PrimaryButton label={loadingMore ? 'Loading more bookings…' : 'Load more bookings'} onPress={() => void loadNextPage()} disabled={loadingMore} /> : null}
      </>}
    </FormScrollView>
  </SafeAreaView>
}
