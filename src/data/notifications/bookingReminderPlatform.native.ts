import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import type { BookingReminderGateway, BookingReminderPlan } from '../../application/services/BookingReminderService'

const CHANNEL_ID = 'booking-reminders'
const REMINDER_TAG = 'bukoraBookingReminder'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export const bookingReminderGateway: BookingReminderGateway = {
  async requestPermission() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Booking reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      })
    }
    const current = await Notifications.getPermissionsAsync()
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
      android: { allowAlert: true, allowBadge: true, allowSound: true },
    })
    return permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  },

  async replaceScheduledReminders(plan: BookingReminderPlan) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(scheduled
      .filter(({ content }) => content.data?.[REMINDER_TAG] === true)
      .map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)))

    for (const reminder of plan.occurrences) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming booking',
          body: `${reminder.guestName} checks in on ${reminder.checkInDate}.`,
          sound: 'default',
          badge: reminder.badgeCount,
          data: { [REMINDER_TAG]: true, bookingId: reminder.bookingId, checkInDate: reminder.checkInDate, notificationId: reminder.id },
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.triggerAt,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
      })
    }
    await Notifications.setBadgeCountAsync(plan.badgeCount)
  },

  async dismissPresentedReminders(notificationIds) {
    const notificationIdSet = new Set(notificationIds)
    if (notificationIdSet.size === 0) return
    const presented = await Notifications.getPresentedNotificationsAsync()
    await Promise.all(presented.flatMap((notification) => {
      const data = notification.request.content.data
      if (data[REMINDER_TAG] !== true) return []
      const id = typeof data.notificationId === 'string' ? data.notificationId : null
      const bookingId = typeof data.bookingId === 'string' ? data.bookingId : null
      const matches = (id !== null && notificationIdSet.has(id))
        || (id === null && bookingId !== null && [...notificationIdSet].some((value) => value.startsWith(`booking-reminder:${bookingId}:`)))
      return matches ? [Notifications.dismissNotificationAsync(notification.request.identifier)] : []
    }))
  },
}

export function addBookingReminderResponseListener(listener: (bookingId: string) => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data
    const bookingId = data.bookingId
    if (data[REMINDER_TAG] === true && typeof bookingId === 'string') listener(bookingId)
  })
}

export async function getLastBookingReminderResponse(): Promise<string | null> {
  const response = await Notifications.getLastNotificationResponseAsync()
  if (!response) return null
  const data = response.notification.request.content.data
  const bookingId = data.bookingId
  return data[REMINDER_TAG] === true && typeof bookingId === 'string' ? bookingId : null
}

export async function clearLastBookingReminderResponse(): Promise<void> {
  await Notifications.clearLastNotificationResponseAsync()
}
