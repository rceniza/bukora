import { getStayNightCount } from '../../src/shared/utils/date'
import { Text, View } from 'react-native'

export function StayDurationSummary({ checkInDate, checkOutDate }: { checkInDate: string; checkOutDate: string }) {
  const nights = getStayNightCount(checkInDate, checkOutDate)
  const duration = nights === null
    ? 'Choose valid dates'
    : `${nights} ${nights === 1 ? 'night' : 'nights'}`

  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-cenere-50 px-4 py-3">
      <Text className="text-sm text-muted">Length of stay</Text>
      <Text className="font-semibold text-cenere-700">{duration}</Text>
    </View>
  )
}
