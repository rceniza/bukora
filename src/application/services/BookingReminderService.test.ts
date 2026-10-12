import type { AppSettings, BookingId, UUID } from '../../domain/models'
import type { BookingAggregate } from '../../domain/ports/BookingRepository'
import { BookingReminderService, buildBookingReminderPlan } from './BookingReminderService'

const bookingId = '10000000-0000-4000-8000-000000000001' as BookingId
const baseBooking = {
  id: bookingId,
  status: 'confirmed' as const,
  confirmationDepositAmountMinor: 100000,
  guestName: 'Ava Guest',
  address: null,
  cellphone: '09171234567',
  email: null,
  pax: 2,
  checkInDate: '2026-10-15',
  checkOutDate: '2026-10-16',
  notes: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  cancelledAt: null,
}

function aggregate(status: BookingAggregate['booking']['status'], id = bookingId, checkInDate = '2026-10-15'): Pick<BookingAggregate, 'booking'> {
  return { booking: { ...baseBooking, id, status, checkInDate } }
}

const reminderSettings: Pick<AppSettings, 'bookingRemindersEnabled' | 'bookingReminderLeadHours' | 'bookingReminderRepeatHours'> = {
  bookingRemindersEnabled: true,
  bookingReminderLeadHours: 24,
  bookingReminderRepeatHours: 0,
}

describe('buildBookingReminderPlan', () => {
  it('schedules one reminder for a future confirmed booking and excludes all other statuses', () => {
    const plan = buildBookingReminderPlan([
      aggregate('confirmed'),
      aggregate('tentative', '10000000-0000-4000-8000-000000000002' as UUID),
      aggregate('cancelled', '10000000-0000-4000-8000-000000000003' as UUID),
      aggregate('completed', '10000000-0000-4000-8000-000000000004' as UUID),
    ], reminderSettings, new Date(2026, 9, 13, 10))

    expect(plan.occurrences).toHaveLength(1)
    expect(plan.occurrences[0]).toMatchObject({ bookingId, guestName: 'Ava Guest', checkInDate: '2026-10-15', badgeCount: 1 })
    expect(plan.occurrences[0].triggerAt).toEqual(new Date(2026, 9, 14, 9))
  })

  it('repeats within the lead window and stops at check-in', () => {
    const plan = buildBookingReminderPlan([aggregate('confirmed')], {
      ...reminderSettings,
      bookingReminderRepeatHours: 6,
    }, new Date(2026, 9, 13, 10))

    expect(plan.occurrences.map(({ triggerAt }) => triggerAt)).toEqual([
      new Date(2026, 9, 14, 9), new Date(2026, 9, 14, 15),
      new Date(2026, 9, 14, 21), new Date(2026, 9, 15, 3),
    ])
  })

  it('keeps future repeats when the app opens after the first reminder time', () => {
    const plan = buildBookingReminderPlan([aggregate('confirmed')], {
      ...reminderSettings,
      bookingReminderRepeatHours: 6,
    }, new Date(2026, 9, 14, 10))

    expect(plan.occurrences.map(({ triggerAt }) => triggerAt)).toEqual([
      new Date(2026, 9, 14, 15), new Date(2026, 9, 14, 21), new Date(2026, 9, 15, 3),
    ])
  })

  it('does not schedule past reminders and counts confirmed bookings currently inside their reminder window', () => {
    const otherId = '10000000-0000-4000-8000-000000000002' as UUID
    const plan = buildBookingReminderPlan([
      aggregate('confirmed'),
      aggregate('confirmed', otherId, '2026-10-16'),
    ], reminderSettings, new Date(2026, 9, 14, 10))

    expect(plan.occurrences.map(({ bookingId: id }) => id)).toEqual([otherId])
    expect(plan.occurrences[0].triggerAt).toEqual(new Date(2026, 9, 15, 9))
    expect(plan.badgeCount).toBe(1)
  })

  it('clears schedules and badges when reminders are disabled', () => {
    expect(buildBookingReminderPlan([aggregate('confirmed')], {
      ...reminderSettings,
      bookingRemindersEnabled: false,
    }, new Date(2026, 9, 13, 10))).toEqual({ occurrences: [], badgeCount: 0 })
  })

  it('ignores invalid check-in dates and caps large repeated schedules', () => {
    const invalid = aggregate('confirmed', bookingId, '2026-02-30')
    const many = Array.from({ length: 4 }, (_, index) => aggregate(
      'confirmed', `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` as UUID,
    ))
    const bounded = buildBookingReminderPlan(many, {
      ...reminderSettings,
      bookingReminderLeadHours: 168,
      bookingReminderRepeatHours: 1,
    }, new Date(2026, 9, 1))

    expect(buildBookingReminderPlan([invalid], reminderSettings, new Date(2026, 9, 1)).occurrences).toEqual([])
    expect(bounded.occurrences).toHaveLength(60)
  })
})

describe('BookingReminderService', () => {
  it('replaces scheduled reminders through its platform gateway', async () => {
    const gateway = {
      requestPermission: jest.fn(async () => true),
      replaceScheduledReminders: jest.fn(async () => undefined),
    }
    const service = new BookingReminderService(gateway)

    await expect(service.requestPermission()).resolves.toBe(true)
    await service.synchronize([aggregate('confirmed')], reminderSettings, new Date(2026, 9, 13, 10))

    expect(gateway.replaceScheduledReminders).toHaveBeenCalledWith(expect.objectContaining({
      occurrences: [expect.objectContaining({ bookingId })], badgeCount: 0,
    }))
  })
})
