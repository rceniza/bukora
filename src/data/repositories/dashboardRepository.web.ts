import type { DashboardRepository } from '../../domain/ports/DashboardRepository'

export const dashboardRepository: DashboardRepository = {
  async getSnapshot() {
    return { bookings: [], recentPayments: [] }
  },
}
