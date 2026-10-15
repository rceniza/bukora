import type { AppSettings, BookingId } from '../../domain/models'
import type { BookingAggregate, BookingRepository } from '../../domain/ports/BookingRepository'
import { NotificationInboxService, buildCurrentBookingNotifications } from './NotificationInboxService'

const settings: Pick<AppSettings, 'bookingRemindersEnabled' | 'bookingReminderLeadHours'> = {
  bookingRemindersEnabled: true,
  bookingReminderLeadHours: 24,
}

function aggregate(id: string, status: BookingAggregate['booking']['status'], checkInDate: string): BookingAggregate {
  return {
    booking: {
      id: id as BookingId,
      status,
      confirmationDepositAmountMinor: 100_000,
      guestName: `Guest ${id}`,
      address: null,
      cellphone: '+639171234567',
      email: null,
      pax: 2,
      checkInDate,
      checkOutDate: '2026-10-16',
      notes: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      cancelledAt: null,
    },
    lineItems: [],
    payments: [],
    activity: [],
  }
}

describe('booking notification inbox', () => {
  const now = new Date(2026, 9, 14, 10)

  it('lists only confirmed bookings whose reminder time has arrived', () => {
    const list = buildCurrentBookingNotifications([
      aggregate('confirmed', 'confirmed', '2026-10-15'),
      aggregate('tentative', 'tentative', '2026-10-15'),
      aggregate('cancelled', 'cancelled', '2026-10-15'),
      aggregate('too-early', 'confirmed', '2026-10-16'),
      aggregate('already-checked-in', 'confirmed', '2026-10-14'),
    ], settings, now)

    expect(list).toEqual([{
      id: 'booking-reminder:confirmed:2026-10-15',
      bookingId: 'confirmed',
      guestName: 'Guest confirmed',
      checkInDate: '2026-10-15',
    }])
  })

  it('respects the booking-reminders setting and skips invalid dates', () => {
    expect(buildCurrentBookingNotifications([aggregate('a', 'confirmed', '2026-10-15')], {
      ...settings,
      bookingRemindersEnabled: false,
    }, now)).toEqual([])
    expect(buildCurrentBookingNotifications([aggregate('bad', 'confirmed', '2026-02-30')], settings, now)).toEqual([])
  })

  it('persists read state and exposes unread status for the current reminder window', async () => {
    const readIds = new Set<string>()
    const readState = {
      listReadIds: jest.fn(async () => [...readIds]),
      markRead: jest.fn(async (ids: string[]) => { ids.forEach((id) => readIds.add(id)) }),
    }
    const bookingRepository = {
      listAll: jest.fn(async () => [aggregate('a', 'confirmed', '2026-10-15')]),
    } as unknown as BookingRepository
    const service = new NotificationInboxService(bookingRepository, readState)
    const [notification] = await service.listCurrent(settings, now)

    expect(notification.isRead).toBe(false)
    await service.markAsRead([notification.id])
    await expect(service.listReadIds()).resolves.toEqual([notification.id])
    await expect(service.listCurrent(settings, now)).resolves.toMatchObject([{ id: notification.id, isRead: true }])
    expect(readState.markRead).toHaveBeenCalledWith([notification.id])
  })
})
