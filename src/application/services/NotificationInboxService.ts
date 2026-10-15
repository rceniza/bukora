import type { AppSettings, BookingId } from '../../domain/models'
import type { BookingRepository } from '../../domain/ports/BookingRepository'

export interface BookingInboxNotification {
  id: string
  bookingId: BookingId
  guestName: string
  checkInDate: string
  isRead: boolean
}

export interface NotificationReadRepository {
  listReadIds(): Promise<string[]>
  markRead(ids: string[]): Promise<void>
}

export function buildCurrentBookingNotifications(
  bookings: Awaited<ReturnType<BookingRepository['listAll']>>,
  settings: Pick<AppSettings, 'bookingRemindersEnabled' | 'bookingReminderLeadHours'>,
  now: Date,
): Omit<BookingInboxNotification, 'isRead'>[] {
  if (!settings.bookingRemindersEnabled) return []

  const leadMilliseconds = settings.bookingReminderLeadHours * 60 * 60 * 1000
  return bookings.flatMap(({ booking }) => {
    if (booking.status !== 'confirmed') return []
    const checkInAt = parseCheckInDate(booking.checkInDate)
    if (!checkInAt) return []
    const reminderAt = checkInAt.getTime() - leadMilliseconds
    if (now.getTime() < reminderAt || now.getTime() >= checkInAt.getTime()) return []
    return [{
      id: `booking-reminder:${booking.id}:${booking.checkInDate}`,
      bookingId: booking.id,
      guestName: booking.guestName,
      checkInDate: booking.checkInDate,
    }]
  }).sort((left, right) => left.checkInDate.localeCompare(right.checkInDate)
    || left.bookingId.localeCompare(right.bookingId))
}

export class NotificationInboxService {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly readState: NotificationReadRepository,
  ) {}

  async listCurrent(
    settings: Pick<AppSettings, 'bookingRemindersEnabled' | 'bookingReminderLeadHours'>,
    now: Date = new Date(),
  ): Promise<BookingInboxNotification[]> {
    const [bookings, readIds] = await Promise.all([
      this.bookings.listAll(),
      this.readState.listReadIds(),
    ])
    const readSet = new Set(readIds)
    return buildCurrentBookingNotifications(bookings, settings, now)
      .map((notification) => ({ ...notification, isRead: readSet.has(notification.id) }))
  }

  markAsRead(ids: string[]): Promise<void> {
    return ids.length === 0 ? Promise.resolve() : this.readState.markRead(ids)
  }
}

function parseCheckInDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 9, 0, 0, 0)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null
}
