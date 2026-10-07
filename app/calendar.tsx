import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { bookingRepository } from '../src/data/repositories/bookingRepository'
import type { BookingAggregate } from '../src/domain/ports/BookingRepository'
import { formatDisplayDate } from '../src/shared/utils/date'

export default function CalendarScreen() {
  const router = useRouter()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [records, setRecords] = useState<BookingAggregate[]>([])
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  useEffect(() => { bookingRepository.listAll().then(setRecords).finally(() => setLoading(false)) }, [])
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const dateMap = useMemo(() => {
    const map = new Map<string, BookingAggregate[]>()
    for (const record of records) {
      const { booking } = record
      if (booking.status === 'cancelled') continue
      const start = new Date(`${booking.checkInDate}T00:00:00`)
      const end = new Date(`${booking.checkOutDate}T00:00:00`)
      for (let cursor = start; cursor < end; cursor = new Date(cursor.getTime() + 86400000)) {
        const key = format(cursor, 'yyyy-MM-dd')
        map.set(key, [...(map.get(key) ?? []), record])
      }
    }
    return map
  }, [records])
  const selected = dateMap.get(selectedDay) ?? []

  return <SafeAreaView className="flex-1 bg-canvas"><ScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
    <Pressable onPress={() => router.back()} accessibilityRole="button"><Text className="font-semibold text-cenere-700">‹ Bookings</Text></Pressable>
    <View><Text className="text-sm font-medium uppercase text-cenere-700">Availability</Text><Text className="mt-1 text-3xl font-bold text-ink">Calendar</Text></View>
    <SurfaceCard className="gap-4"><View className="flex-row items-center justify-between"><Pressable onPress={() => { const next = startOfMonth(subMonths(month, 1)); setMonth(next); setSelectedDay(format(next, 'yyyy-MM-dd')) }} accessibilityLabel="Previous month" accessibilityRole="button" className="rounded-full bg-canvas px-4 py-2"><Text>‹</Text></Pressable><Text className="text-lg font-semibold text-ink">{format(month, 'MMMM yyyy')}</Text><Pressable onPress={() => { const next = startOfMonth(addMonths(month, 1)); setMonth(next); setSelectedDay(format(next, 'yyyy-MM-dd')) }} accessibilityLabel="Next month" accessibilityRole="button" className="rounded-full bg-canvas px-4 py-2"><Text>›</Text></Pressable></View>
      <View className="flex-row">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} className="w-[14.28%] py-2 text-center text-xs font-medium text-muted">{day}</Text>)}</View>
      <View className="flex-row flex-wrap">{Array.from({ length: days[0].getDay() }, (_, index) => <View key={`blank-${index}`} className="h-12 w-[14.28%]" />)}{days.map((day) => { const key = format(day, 'yyyy-MM-dd'); const hasBooking = Boolean(dateMap.get(key)?.length); const active = selectedDay === key; return <Pressable key={key} onPress={() => setSelectedDay(key)} accessibilityRole="button" accessibilityLabel={`${format(day, 'MMMM d, yyyy')}${hasBooking ? ', booked' : ''}`} className={`h-12 w-[14.28%] items-center justify-center rounded-full ${active ? 'bg-cenere-600' : ''}`}><Text className={active ? 'font-semibold text-white' : 'text-ink'}>{format(day, 'd')}</Text>{hasBooking ? <View className={`absolute bottom-1 h-1 w-1 rounded-full ${active ? 'bg-white' : 'bg-cenere-600'}`} /> : null}</Pressable>})}</View>
    </SurfaceCard>
    <Text className="text-lg font-semibold text-ink">{formatDisplayDate(selectedDay)}</Text>
    {loading ? <LoadingState message="Loading calendar" /> : selected.length === 0 ? <EmptyState title="No stays on this day" message="Choose another date to see its bookings." /> : selected.map(({ booking }) => <Pressable key={booking.id} onPress={() => router.push(`/booking/${booking.id}`)} accessibilityRole="button"><SurfaceCard className="gap-1"><Text className="font-semibold text-ink">{booking.guestName}</Text><Text className="text-sm text-muted">{formatDisplayDate(booking.checkInDate)} – {formatDisplayDate(booking.checkOutDate)}</Text></SurfaceCard></Pressable>)}
  </ScrollView></SafeAreaView>
}
