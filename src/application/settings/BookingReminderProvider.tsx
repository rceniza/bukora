import { AppState } from 'react-native'
import { createContext, useCallback, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'expo-router'
import { BookingReminderService } from '../services/BookingReminderService'
import { useAppSettings } from './AppSettingsContext'
import {
  addBookingReminderResponseListener,
  bookingReminderGateway,
  clearLastBookingReminderResponse,
  getLastBookingReminderResponse,
} from '../../data/notifications/bookingReminderPlatform'

interface BookingReminderContextValue {
  requestPermission: () => Promise<boolean>
  refresh: () => Promise<void>
  dismissPresentedReminders: (notificationIds: string[]) => Promise<void>
}

const reminderService = new BookingReminderService(bookingReminderGateway)
const BookingReminderContext = createContext<BookingReminderContextValue>({
  requestPermission: () => reminderService.requestPermission(),
  refresh: async () => undefined,
  dismissPresentedReminders: async () => undefined,
})

export function BookingReminderProvider({ children }: { children: ReactNode }) {
  const { settings, ready } = useAppSettings()
  const router = useRouter()

  const refresh = useCallback(async () => {
    const [{ bookingRepository }, { notificationInboxService }] = await Promise.all([
      import('../../data/repositories'),
      import('../../data/repositories/notificationInbox'),
    ])
    const [bookings, readIds] = await Promise.all([
      bookingRepository.listAll(),
      notificationInboxService.listReadIds(),
    ])
    await reminderService.synchronize(bookings, settings, new Date(), readIds)
  }, [settings])

  const dismissPresentedReminders = useCallback((notificationIds: string[]) =>
    reminderService.dismissPresentedReminders(notificationIds), [])

  useEffect(() => {
    if (ready) void refresh().catch(() => undefined)
  }, [ready, refresh])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && ready) void refresh().catch(() => undefined)
    })
    return () => subscription.remove()
  }, [ready, refresh])

  useEffect(() => {
    const openBooking = (bookingId: string) => {
      router.push(`/booking/${bookingId}`)
      void (async () => {
        const { notificationInboxService } = await import('../../data/repositories/notificationInbox')
        const current = await notificationInboxService.listCurrent(settings)
        const readIds = current.filter(({ bookingId: id }) => id === bookingId).map(({ id }) => id)
        await notificationInboxService.markAsRead(readIds)
        await refresh()
        await dismissPresentedReminders(readIds)
      })().catch(() => undefined)
    }
    const subscription = addBookingReminderResponseListener(openBooking)
    void getLastBookingReminderResponse().then((bookingId) => {
      if (!bookingId) return
      openBooking(bookingId)
      return clearLastBookingReminderResponse()
    }).catch(() => undefined)
    return () => subscription.remove()
  }, [dismissPresentedReminders, refresh, router, settings])

  return (
    <BookingReminderContext.Provider value={{ requestPermission: () => reminderService.requestPermission(), refresh, dismissPresentedReminders }}>
      {children}
    </BookingReminderContext.Provider>
  )
}

export function useBookingReminders(): BookingReminderContextValue {
  return useContext(BookingReminderContext)
}
