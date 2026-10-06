import { Link } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmptyState } from '../../components/ui/EmptyState'

export default function NewBookingRoute() {
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
        <Link href="/" className="self-start rounded-full bg-white px-4 py-3 text-sm font-semibold text-ink">Back to dashboard</Link>
        <View className="gap-2">
          <Text className="text-3xl font-bold text-ink">Add a booking</Text>
          <Text className="text-base leading-6 text-muted">Record a new stay for Cenere Beach House.</Text>
        </View>
        <EmptyState title="Booking form is being prepared" message="Guest details, dates, room options, and the live price breakdown are coming in the booking task." />
      </ScrollView>
    </SafeAreaView>
  )
}
