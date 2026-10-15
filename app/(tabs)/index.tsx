import { useCallback, useState } from 'react'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SurfaceCard } from '../../components/ui/SurfaceCard'
import { AmountDisplay } from '../../components/ui/AmountDisplay'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAppSettings } from '../../src/application/settings/AppSettingsContext'
import { useDashboard } from '../../src/application/dashboard/DashboardContext'
import { formatDisplayDate } from '../../src/shared/utils/date'
import { formatPHPAmount } from '../../src/shared/utils/money'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { DashboardAvailabilityCalendar } from '../../components/dashboard/DashboardAvailabilityCalendar'
import { BukoraLogo } from '../../components/brand/BukoraLogo'
import { NotificationBell } from '../../components/notifications/NotificationBell'
import { notificationInboxService } from '../../src/data/repositories/notificationInbox'

export default function DashboardScreen() {
  const router = useRouter()
  const { settings } = useAppSettings()
  const { summary, loading, error, refresh } = useDashboard()
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const refreshNotifications = useCallback(async () => {
    const notifications = await notificationInboxService.listCurrent(settings)
    setUnreadNotificationCount(notifications.filter(({ isRead }) => !isRead).length)
  }, [settings])
  useFocusEffect(useCallback(() => {
    void refresh()
    void refreshNotifications().catch(() => setUnreadNotificationCount(0))
  }, [refresh, refreshNotifications]))
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-6 px-5 py-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium text-muted">{settings.propertyName.toUpperCase()}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <BukoraLogo size={36} />
              <Text className="text-3xl font-bold text-ink">{settings.displayName}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <NotificationBell unreadCount={unreadNotificationCount} onPress={() => router.push('/notifications')} />
            <Link href="/settings" asChild>
              <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-cenere-100" accessibilityRole="button" accessibilityLabel="Settings">
                <Text className="text-lg font-bold text-cenere-700">{settings.propertyName.trim().charAt(0).toUpperCase()}</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View className="rounded-3xl bg-cenere-600 p-6">
          <Text className="text-sm font-medium text-white/80">YOUR BOOKING LEDGER</Text>
          <Text className="mt-2 text-2xl font-bold text-white">Keep every stay in view.</Text>
          <Text className="mt-2 text-base leading-6 text-white/80">
            Bookings, payments, and guest details together — ready whenever you need them.
          </Text>
        </View>

        <Link href="/booking/new" asChild>
          <PrimaryButton label="Add booking" />
        </Link>
        <Link href="/booking" asChild>
          <Pressable accessibilityRole="button" className="-mt-3 items-center rounded-2xl border border-cenere-600 px-4 py-3">
            <Text className="font-semibold text-cenere-700">View all bookings</Text>
          </Pressable>
        </Link>
        <View className="flex-row gap-3">
          <SurfaceCard padded={false} className="flex-1 p-4">
            <Text className="text-sm text-muted">Upcoming</Text>
            <Text className="mt-2 text-2xl font-bold text-ink">{loading ? '…' : summary.upcomingCount}</Text>
            <Text className="mt-1 text-xs text-muted">stays</Text>
          </SurfaceCard>
          <SurfaceCard padded={false} className="flex-1 p-4">
            <Text className="text-sm text-muted">Balance due</Text>
            <AmountDisplay amountMinor={loading ? 0 : summary.totalBalanceDueMinor} emphasis="strong" amountClassName="mt-2 text-2xl" />
            <Text className="mt-1 text-xs text-muted">across bookings</Text>
          </SurfaceCard>
        </View>

        <DashboardAvailabilityCalendar
          bookings={summary.availabilityBookings}
          onSelectAvailableDate={(date) => router.push({ pathname: '/booking/new', params: { checkInDate: date } })}
          onSelectBooking={(id) => router.push(`/booking/${id}`)}
          onOpenFullCalendar={() => router.push('/calendar')}
        />

        <SurfaceCard className="gap-3">
          <SectionHeading title="Upcoming bookings" />
          {error ? <ErrorState message="Your local booking summary could not be loaded." onRetry={() => void refresh()} />
            : loading ? <LoadingState message="Loading upcoming bookings" />
              : summary.upcomingBookings.length === 0 ? (
                <EmptyState
                  title={summary.bookingCount > 0 ? 'No upcoming bookings' : 'No bookings yet'}
                  message="Your booking calendar and guest records stay on this device and are available offline."
                />
              ) : summary.upcomingBookings.map((booking) => (
                <View key={booking.id} className="gap-2 rounded-2xl bg-canvas p-4">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="flex-1 text-base font-semibold text-ink">{booking.guestName}</Text>
                    <Text className={`text-xs font-medium uppercase ${booking.status === 'tentative' ? 'text-amber-700' : 'text-cenere-700'}`}>{booking.status}</Text>
                  </View>
                  <Text className="text-sm text-muted">{formatDisplayDate(booking.checkInDate)} · {formatDisplayDate(booking.checkOutDate)}</Text>
                  <Text className="text-sm font-medium text-ink">Balance {formatPHPAmount(booking.balanceDueMinor)}</Text>
                </View>
              ))}
        </SurfaceCard>

        <SurfaceCard className="gap-3">
          <SectionHeading title="Recent payments" />
          {error ? <ErrorState message="Payment activity could not be loaded." onRetry={() => void refresh()} />
            : loading ? <LoadingState message="Loading recent payments" />
              : summary.recentPayments.length === 0 ? (
                <EmptyState title="No payments recorded" message="Payments and refunds will appear here when recorded against a booking." />
              ) : summary.recentPayments.map((payment) => (
                <Pressable key={payment.id} onPress={() => router.push(`/booking/${payment.bookingId}`)} accessibilityRole="button" accessibilityLabel={`View payment history for ${payment.guestName}`}>
                <View className="flex-row items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                  <View className="flex-1 gap-1">
                    <Text className="text-sm font-semibold text-ink">{payment.guestName}</Text>
                    <Text className="text-xs text-muted">{formatDisplayDate(payment.paidAt)} · {payment.method ?? payment.kind}</Text>
                    {payment.transactionReference ? <Text className="text-xs text-muted">Ref {payment.transactionReference}</Text> : null}
                  </View>
                  <Text className={`text-sm font-semibold ${payment.kind === 'refund' ? 'text-amber-700' : 'text-cenere-700'}`}>
                    {payment.kind === 'refund' ? '−' : '+'}{formatPHPAmount(payment.amountMinor)}
                  </Text>
                </View>
                </Pressable>
              ))}
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  )
}
