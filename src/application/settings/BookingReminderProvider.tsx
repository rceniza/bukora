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
}

const reminderService = new BookingReminderService(bookingReminderGateway)
const BookingReminderContext = createContext<BookingReminderContextValue>({
  requestPermission: () => reminderService.requestPermission(),
  refresh: async () => undefined,
})

export function BookingReminderProvider({ children }: { children: ReactNode }) {
  const { settings, ready } = useAppSettings()
  const router = useRouter()

  const refresh = useCallback(async () => {
    const { bookingRepository } = await import('../../data/repositories')
    const bookings = await bookingRepository.listAll()
    await reminderService.synchronize(bookings, settings)
  }, [settings])

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
    const openBooking = (bookingId: string) => router.push(`/booking/${bookingId}`)
    const subscription = addBookingReminderResponseListener(openBooking)
    void getLastBookingReminderResponse().then((bookingId) => {
      if (!bookingId) return
      openBooking(bookingId)
      return clearLastBookingReminderResponse()
    }).catch(() => undefined)
    return () => subscription.remove()
  }, [router])

  return (
    <BookingReminderContext.Provider value={{ requestPermission: () => reminderService.requestPermission(), refresh }}>
      {children}
    </BookingReminderContext.Provider>
  )
}

export function useBookingReminders(): BookingReminderContextValue {
  return useContext(BookingReminderContext)
}
