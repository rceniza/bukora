import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import NotificationsScreen from '../app/notifications'
import type { BookingInboxNotification } from '../src/application/services/NotificationInboxService'
import { notificationInboxService } from '../src/data/repositories/notificationInbox'

jest.mock('../src/application/settings/AppSettingsContext', () => ({
  useAppSettings: () => ({ settings: { bookingRemindersEnabled: true, bookingReminderLeadHours: 24 } }),
}))
const mockRefreshBookingReminders = jest.fn(async () => undefined)
const mockDismissPresentedReminders = jest.fn(async () => undefined)
jest.mock('../src/application/settings/BookingReminderProvider', () => ({
  useBookingReminders: () => ({ refresh: mockRefreshBookingReminders, dismissPresentedReminders: mockDismissPresentedReminders }),
}))
jest.mock('../src/data/repositories/notificationInbox', () => ({
  notificationInboxService: { listCurrent: jest.fn(), markAsRead: jest.fn(async () => undefined) },
}))
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))
const mockPush = jest.fn()
jest.mock('expo-router', () => {
  const React = jest.requireActual('react')
  return {
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, []),
    useRouter: () => ({ push: mockPush, replace: jest.fn(), canGoBack: () => false }),
  }
})

const notification: BookingInboxNotification = {
  id: 'booking-reminder:booking-uuid:2026-10-15',
  bookingId: 'booking-uuid' as BookingInboxNotification['bookingId'],
  guestName: 'Alex Guest',
  checkInDate: '2026-10-15',
  isRead: false,
}

describe('notification center', () => {
  beforeEach(() => {
    jest.mocked(notificationInboxService.listCurrent).mockResolvedValue([notification])
    jest.mocked(notificationInboxService.markAsRead).mockResolvedValue(undefined)
    mockRefreshBookingReminders.mockClear()
    mockDismissPresentedReminders.mockClear()
  })

  it('shows active booking reminders and marks them read when the center is opened', async () => {
    render(<NotificationsScreen />)

    expect(await screen.findByText('Notifications')).toBeTruthy()
    expect(await screen.findByText('Alex Guest checks in on Oct 15, 2026.')).toBeTruthy()
    await waitFor(() => expect(notificationInboxService.markAsRead).toHaveBeenCalledWith([notification.id]))
    await waitFor(() => expect(mockRefreshBookingReminders).toHaveBeenCalled())
    expect(mockDismissPresentedReminders).toHaveBeenCalledWith([notification.id])
  })

  it('opens the associated booking when a notification is selected', async () => {
    render(<NotificationsScreen />)

    fireEvent.press(await screen.findByRole('button', { name: /Alex Guest/ }))
    expect(mockPush).toHaveBeenCalledWith('/booking/booking-uuid')
  })
})
