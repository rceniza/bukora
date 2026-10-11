import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { BookingId } from '../../src/domain/models'
import type { AvailabilityBooking } from '../../src/domain/services/dashboardSummary'
import { buildBookingAvailabilityMap } from '../../src/domain/services/bookingAvailability'
import { SurfaceCard } from '../ui/SurfaceCard'

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export interface DashboardAvailabilityCalendarProps {
  bookings: AvailabilityBooking[]
  onSelectAvailableDate: (date: string) => void
  onSelectBooking: (id: BookingId) => void
  onOpenFullCalendar: () => void
  initialMonth?: Date
}

export function DashboardAvailabilityCalendar({
  bookings,
  onSelectAvailableDate,
  onSelectBooking,
  onOpenFullCalendar,
  initialMonth = new Date(),
}: DashboardAvailabilityCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(initialMonth))
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const availability = useMemo(() => buildBookingAvailabilityMap(bookings), [bookings])
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <SurfaceCard className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-ink">Availability</Text>
        <Pressable onPress={onOpenFullCalendar} accessibilityRole="button" accessibilityLabel="Open full calendar" className="rounded-full px-3 py-2">
          <Text className="text-sm font-semibold text-cenere-700">Full calendar</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => setMonth((current) => startOfMonth(subMonths(current, 1)))} accessibilityLabel="Previous month" accessibilityRole="button" className="h-10 w-10 items-center justify-center rounded-full bg-canvas">
          <Text className="text-xl text-ink">‹</Text>
        </Pressable>
        <Text className="text-base font-semibold text-ink">{format(month, 'MMMM yyyy')}</Text>
        <Pressable onPress={() => setMonth((current) => startOfMonth(addMonths(current, 1)))} accessibilityLabel="Next month" accessibilityRole="button" className="h-10 w-10 items-center justify-center rounded-full bg-canvas">
          <Text className="text-xl text-ink">›</Text>
        </Pressable>
      </View>

      <View className="flex-row">
        {weekdays.map((day, index) => <Text key={`${day}-${index}`} className="w-[14.28%] py-1 text-center text-xs font-medium text-muted">{day}</Text>)}
      </View>
      <View className="flex-row flex-wrap">
        {Array.from({ length: days[0].getDay() }, (_, index) => <View key={`blank-${index}`} className="mb-1 h-11 w-[14.28%]" />)}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const bookedBy = availability.get(key) ?? []
          const booked = bookedBy.length > 0
          const currentDay = key === today
          const accessibilityLabel = booked
            ? `${format(day, 'MMMM d, yyyy')}, booked${bookedBy.length === 1 ? `: ${bookedBy[0].guestName}` : `: ${bookedBy.length} bookings`}`
            : `${format(day, 'MMMM d, yyyy')}, available`

          return (
            <Pressable
              key={key}
              onPress={() => booked ? onSelectBooking(bookedBy[0].id) : onSelectAvailableDate(key)}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              className={`relative mb-1 h-11 w-[14.28%] items-center justify-center rounded-xl ${booked ? 'bg-stone-100' : 'border border-emerald-200 bg-emerald-50'} ${currentDay ? 'border-2 border-cenere-600' : ''}`}
            >
              <Text className={`text-sm font-medium ${booked ? 'text-muted' : 'text-emerald-800'}`}>{format(day, 'd')}</Text>
              {booked ? <Text className="absolute right-1 top-0 text-xs font-bold text-amber-700">×</Text> : null}
            </Pressable>
          )
        })}
      </View>

      <View className="flex-row flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3">
        <View className="flex-row items-center gap-2"><View className="h-3 w-3 rounded-sm border border-emerald-300 bg-emerald-50" /><Text className="text-xs text-muted">Available</Text></View>
        <View className="flex-row items-center gap-2"><View className="h-4 w-4 items-center justify-center rounded-sm bg-stone-100"><Text className="text-xs font-bold text-amber-700">×</Text></View><Text className="text-xs text-muted">Booked</Text></View>
      </View>
    </SurfaceCard>
  )
}
