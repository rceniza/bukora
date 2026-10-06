import type { DashboardRepository } from '../../domain/ports/DashboardRepository'
import { bookingRepository } from './bookingRepository'

export const dashboardRepository: DashboardRepository = {
  async getSnapshot(recentPaymentLimit) {
    const aggregates = await bookingRepository.listAll()
    const recentPayments = aggregates.flatMap(({ booking, payments }) => payments.map((payment) => ({
      ...payment,
      guestName: booking.guestName,
    }))).sort((left, right) => right.paidAt.localeCompare(left.paidAt) || right.createdAt.localeCompare(left.createdAt))
      .slice(0, recentPaymentLimit)
    return {
      bookings: aggregates.map(({ booking, lineItems, payments }) => ({ booking, lineItems, payments })),
      recentPayments,
    }
  },
}
