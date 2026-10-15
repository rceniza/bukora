import type { BookingReminderGateway, BookingReminderPlan } from '../../application/services/BookingReminderService'

export const bookingReminderGateway: BookingReminderGateway = {
  async requestPermission() { return false },
  async replaceScheduledReminders(_plan: BookingReminderPlan) {},
  async dismissPresentedReminders(_notificationIds: string[]) {},
}

export function addBookingReminderResponseListener(_listener: (bookingId: string) => void) {
  return { remove() {} }
}

export async function getLastBookingReminderResponse(): Promise<string | null> { return null }
export async function clearLastBookingReminderResponse(): Promise<void> {}
