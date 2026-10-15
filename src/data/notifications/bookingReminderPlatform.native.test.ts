import * as Notifications from 'expo-notifications'
import { bookingReminderGateway } from './bookingReminderPlatform.native'

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }))
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'scheduled-reminder'),
  setBadgeCountAsync: jest.fn(async () => true),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  dismissNotificationAsync: jest.fn(async () => undefined),
}))

describe('native booking reminder notification badges', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sets the app badge to the unread count and stores the stable inbox ID on reminders', async () => {
    await bookingReminderGateway.replaceScheduledReminders({
      badgeCount: 0,
      occurrences: [{
        id: 'booking-reminder:booking-uuid:2026-10-15',
        bookingId: 'booking-uuid' as never,
        guestName: 'Alex Guest',
        checkInDate: '2026-10-15',
        triggerAt: new Date(2026, 9, 15, 8),
        badgeCount: 0,
      }],
    })

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({
        badge: 0,
        data: expect.objectContaining({ notificationId: 'booking-reminder:booking-uuid:2026-10-15' }),
      }),
    }))
    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0)
  })

  it('dismisses only presented Bukora reminders that were marked read', async () => {
    jest.mocked(Notifications.getPresentedNotificationsAsync).mockResolvedValue([
      {
        request: { identifier: 'read-os-id', content: { data: { bukoraBookingReminder: true, notificationId: 'booking-reminder:read:2026-10-15' } } },
      },
      {
        request: { identifier: 'other-os-id', content: { data: { bukoraBookingReminder: true, notificationId: 'booking-reminder:unread:2026-10-16' } } },
      },
      {
        request: { identifier: 'unrelated-os-id', content: { data: { otherApp: true } } },
      },
    ] as unknown as Awaited<ReturnType<typeof Notifications.getPresentedNotificationsAsync>>)

    await bookingReminderGateway.dismissPresentedReminders(['booking-reminder:read:2026-10-15'])

    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledTimes(1)
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('read-os-id')
  })
})
