import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { AppSafeAreaView as SafeAreaView } from '../src/components/layout/AppSafeAreaView'
import { BackButton } from '../components/navigation/BackButton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { useAppSettings } from '../src/application/settings/AppSettingsContext'
import { useBookingReminders } from '../src/application/settings/BookingReminderProvider'
import type { BookingInboxNotification } from '../src/application/services/NotificationInboxService'
import { notificationInboxService } from '../src/data/repositories/notificationInbox'
import { formatDisplayDate } from '../src/shared/utils/date'

export default function NotificationsScreen() {
  const router = useRouter()
  const { settings } = useAppSettings()
  const { refresh: refreshBookingReminders, dismissPresentedReminders } = useBookingReminders()
  const [notifications, setNotifications] = useState<BookingInboxNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const current = await notificationInboxService.listCurrent(settings)
      setNotifications(current)
      const unreadIds = current.filter(({ isRead }) => !isRead).map(({ id }) => id)
      await notificationInboxService.markAsRead(unreadIds)
      await refreshBookingReminders()
      await dismissPresentedReminders(current.map(({ id }) => id))
      setNotifications(current.map((notification) => ({ ...notification, isRead: true })))
    } catch {
      setError('Notifications could not be loaded from this device.')
    } finally {
      setLoading(false)
    }
  }, [dismissPresentedReminders, refreshBookingReminders, settings])
  useFocusEffect(useCallback(() => { void loadNotifications() }, [loadNotifications]))

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
        <BackButton label="Dashboard" fallback="/" />
        <View>
          <Text className="text-sm font-medium uppercase text-cenere-700">Booking reminders</Text>
          <Text className="mt-1 text-3xl font-bold text-ink">Notifications</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">Confirmed bookings appear here when their reminder time arrives. Opening this screen marks them as read.</Text>
        </View>

        {error ? <ErrorState message={error} onRetry={() => void loadNotifications()} />
          : loading ? <LoadingState message="Loading notifications" />
            : notifications.length === 0 ? (
              <SurfaceCard>
                <EmptyState
                  title="You're all caught up"
                  message={settings.bookingRemindersEnabled
                    ? 'There are no active booking reminders right now.'
                    : 'Enable booking reminders in Settings to see upcoming confirmed bookings here.'}
                  actionLabel={!settings.bookingRemindersEnabled ? 'Open settings' : undefined}
                  onActionPress={!settings.bookingRemindersEnabled ? () => router.push('/settings') : undefined}
                />
              </SurfaceCard>
            ) : notifications.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => router.push(`/booking/${notification.bookingId}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open booking reminder for ${notification.guestName}, check-in ${formatDisplayDate(notification.checkInDate)}`}
              >
                <SurfaceCard className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-cenere-100">
                    <Text className="text-lg text-cenere-700">⌂</Text>
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-ink">Upcoming booking</Text>
                    <Text className="text-sm text-muted">{notification.guestName} checks in on {formatDisplayDate(notification.checkInDate)}.</Text>
                  </View>
                </SurfaceCard>
              </Pressable>
            ))}
      </ScrollView>
    </SafeAreaView>
  )
}
