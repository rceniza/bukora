import { Link } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SectionHeading } from '../components/ui/SectionHeading'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { AmountDisplay } from '../components/ui/AmountDisplay'
import { EmptyState } from '../components/ui/EmptyState'
import { useAppSettings } from '../src/application/settings/AppSettingsContext'

export default function DashboardScreen() {
  const { settings } = useAppSettings()
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-6 px-5 py-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium text-muted">{settings.propertyName.toUpperCase()}</Text>
            <Text className="mt-1 text-3xl font-bold text-ink">{settings.displayName}</Text>
          </View>
          <Link href="/settings" asChild>
            <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-cenere-100" accessibilityRole="button" accessibilityLabel="Settings">
              <Text className="text-lg font-bold text-cenere-700">{settings.propertyName.trim().charAt(0).toUpperCase()}</Text>
            </Pressable>
          </Link>
        </View>

        <View className="rounded-3xl bg-cenere-600 p-6">
          <Text className="text-sm font-medium text-white/80">YOUR BOOKING LEDGER</Text>
          <Text className="mt-2 text-2xl font-bold text-white">Keep every stay in view.</Text>
          <Text className="mt-2 text-base leading-6 text-white/80">
            Bookings, payments, and guest details together — ready whenever you need them.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <SurfaceCard padded={false} className="flex-1 p-4">
            <Text className="text-sm text-muted">Upcoming</Text>
            <Text className="mt-2 text-2xl font-bold text-ink">—</Text>
            <Text className="mt-1 text-xs text-muted">stays</Text>
          </SurfaceCard>
          <SurfaceCard padded={false} className="flex-1 p-4">
            <Text className="text-sm text-muted">Balance due</Text>
            <AmountDisplay amountMinor={0} emphasis="strong" amountClassName="mt-2 text-2xl" />
            <Text className="mt-1 text-xs text-muted">across bookings</Text>
          </SurfaceCard>
        </View>

        <SurfaceCard className="gap-3">
          <SectionHeading title="Bookings" />
          <EmptyState
            title="No bookings yet"
            message="Your booking calendar and guest records will appear here. Bukora stores its records on this device and works offline."
          />
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  )
}
