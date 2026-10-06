import { addDays, addMonths, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { formatDisplayDate } from '../../src/shared/utils/date'

interface CalendarDateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function CalendarDateField({ label, value, onChange, error }: CalendarDateFieldProps) {
  const [visible, setVisible] = useState(false)
  const [month, setMonth] = useState(() => value ? parseISO(value) : new Date())
  const selectedDate = value ? parseISO(value) : null
  const firstDay = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const days = Array.from({ length: 42 }, (_, index) => addDays(firstDay, index))

  function selectDate(date: Date) {
    onChange(format(date, 'yyyy-MM-dd'))
    setVisible(false)
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink">{label}</Text>
      <Pressable
        className={`min-h-12 justify-center rounded-xl border bg-white px-4 py-3 ${error ? 'border-red-500' : 'border-stone-200'}`}
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label}`}
        onPress={() => {
          setMonth(selectedDate ?? new Date())
          setVisible(true)
        }}
      >
        <Text className="text-base text-ink">{value ? formatDisplayDate(value) : 'Select a date'}</Text>
      </Pressable>
      {error ? <Text className="text-sm text-red-700" accessibilityRole="alert">{error}</Text> : null}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 justify-end bg-black/40 sm:justify-center sm:px-5">
          <View className="mx-auto w-full max-w-md gap-4 rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-ink">{label}</Text>
              <Pressable onPress={() => setVisible(false)} accessibilityRole="button" accessibilityLabel="Close calendar">
                <Text className="px-2 py-1 text-sm font-semibold text-cenere-700">Done</Text>
              </Pressable>
            </View>
            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => setMonth((current) => addMonths(current, -1))} accessibilityRole="button" accessibilityLabel="Previous month" className="h-10 w-10 items-center justify-center rounded-full bg-canvas">
                <Text className="text-lg text-ink">‹</Text>
              </Pressable>
              <Text className="text-base font-semibold text-ink">{format(month, 'MMMM yyyy')}</Text>
              <Pressable onPress={() => setMonth((current) => addMonths(current, 1))} accessibilityRole="button" accessibilityLabel="Next month" className="h-10 w-10 items-center justify-center rounded-full bg-canvas">
                <Text className="text-lg text-ink">›</Text>
              </Pressable>
            </View>
            <View className="flex-row">
              {weekDays.map((day, index) => <Text key={`${day}-${index}`} className="w-[14.28%] py-2 text-center text-xs font-medium text-muted">{day}</Text>)}
            </View>
            <View className="flex-row flex-wrap">
              {days.map((day) => {
                const selected = selectedDate !== null && isSameDay(day, selectedDate)
                const inMonth = isSameMonth(day, month)
                return (
                  <Pressable
                    key={format(day, 'yyyy-MM-dd')}
                    onPress={() => selectDate(day)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${format(day, 'MMMM d, yyyy')}`}
                    accessibilityState={{ selected }}
                    className={`mb-1 h-11 w-[14.28%] items-center justify-center rounded-full ${selected ? 'bg-cenere-600' : ''}`}
                  >
                    <Text className={`text-sm ${selected ? 'font-semibold text-white' : inMonth ? 'text-ink' : 'text-stone-300'}`}>{format(day, 'd')}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
