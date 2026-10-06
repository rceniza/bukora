import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function DashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-6 px-5 py-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium text-muted">CENERE BEACH HOUSE</Text>
            <Text className="mt-1 text-3xl font-bold text-ink">Bukora</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-cenere-100">
            <Text className="text-lg font-bold text-cenere-700">C</Text>
          </View>
        </View>

        <View className="rounded-3xl bg-cenere-600 p-6">
          <Text className="text-sm font-medium text-white/80">YOUR BOOKING LEDGER</Text>
          <Text className="mt-2 text-2xl font-bold text-white">Keep every stay in view.</Text>
          <Text className="mt-2 text-base leading-6 text-white/80">
            Bookings, payments, and guest details together — ready whenever you need them.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white p-4">
            <Text className="text-sm text-muted">Upcoming</Text>
            <Text className="mt-2 text-2xl font-bold text-ink">—</Text>
            <Text className="mt-1 text-xs text-muted">stays</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white p-4">
            <Text className="text-sm text-muted">Balance due</Text>
            <Text className="mt-2 text-2xl font-bold text-ink">₱0</Text>
            <Text className="mt-1 text-xs text-muted">across bookings</Text>
          </View>
        </View>

        <View className="gap-3 rounded-2xl bg-white p-5">
          <Text className="text-lg font-semibold text-ink">Getting started</Text>
          <Text className="leading-6 text-muted">
            Your booking calendar and guest records will appear here. This app stores its records on this device and works offline.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
