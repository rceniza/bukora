import type { AppSettings, BookingId } from '../../domain/models'
import type { BookingAggregate } from '../../domain/ports/BookingRepository'

const CHECK_IN_REMINDER_HOUR = 9
const MAX_PENDING_REMINDERS = 60

export interface BookingReminderOccurrence {
  bookingId: BookingId
  guestName: string
  checkInDate: string
  triggerAt: Date
  badgeCount: number
}

export interface BookingReminderPlan {
  occurrences: BookingReminderOccurrence[]
  badgeCount: number
}

export interface BookingReminderGateway {
  requestPermission(): Promise<boolean>
  replaceScheduledReminders(plan: BookingReminderPlan): Promise<void>
}

export function buildBookingReminderPlan(
  bookings: Pick<BookingAggregate, 'booking'>[],
  settings: Pick<AppSettings, 'bookingRemindersEnabled' | 'bookingReminderLeadHours' | 'bookingReminderRepeatHours'>,
  now: Date,
): BookingReminderPlan {
  if (!settings.bookingRemindersEnabled) return { occurrences: [], badgeCount: 0 }

  const confirmed = bookings.flatMap(({ booking }) => {
    if (booking.status !== 'confirmed') return []
    const checkInAt = checkInDateAtReminderTime(booking.checkInDate)
    return checkInAt ? [{
      id: booking.id,
      name: booking.guestName,
      checkInDate: booking.checkInDate,
      checkInAt,
    }] : []
  })

  const leadMs = settings.bookingReminderLeadHours * 60 * 60 * 1000
  const badgeCount = confirmed.filter(({ checkInAt }) => {
    const startsAt = checkInAt.getTime() - leadMs
    return now.getTime() >= startsAt && now.getTime() < checkInAt.getTime()
  }).length

  const planned: BookingReminderOccurrence[] = []
  for (const booking of confirmed) {
    const firstReminderAt = new Date(booking.checkInAt.getTime() - leadMs)
    const intervalMs = settings.bookingReminderRepeatHours * 60 * 60 * 1000
    let triggerTime = firstReminderAt.getTime()
    while (triggerTime < booking.checkInAt.getTime()) {
      if (triggerTime > now.getTime()) {
        planned.push({
          bookingId: booking.id,
          guestName: booking.name,
          checkInDate: booking.checkInDate,
          triggerAt: new Date(triggerTime),
          badgeCount: confirmed.filter(({ checkInAt }) => {
            const startsAt = checkInAt.getTime() - leadMs
            return triggerTime >= startsAt && triggerTime < checkInAt.getTime()
          }).length,
        })
      }
      if (intervalMs === 0) break
      triggerTime += intervalMs
    }
  }

  planned.sort((left, right) => left.triggerAt.getTime() - right.triggerAt.getTime()
    || left.bookingId.localeCompare(right.bookingId))
  return { occurrences: planned.slice(0, MAX_PENDING_REMINDERS), badgeCount }
}

export class BookingReminderService {
  constructor(private readonly gateway: BookingReminderGateway) {}

  requestPermission(): Promise<boolean> {
    return this.gateway.requestPermission()
  }

  async synchronize(
    bookings: Pick<BookingAggregate, 'booking'>[],
    settings: Pick<AppSettings, 'bookingRemindersEnabled' | 'bookingReminderLeadHours' | 'bookingReminderRepeatHours'>,
    now: Date = new Date(),
  ): Promise<void> {
    await this.gateway.replaceScheduledReminders(buildBookingReminderPlan(bookings, settings, now))
  }
}

function checkInDateAtReminderTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, CHECK_IN_REMINDER_HOUR, 0, 0, 0)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}
