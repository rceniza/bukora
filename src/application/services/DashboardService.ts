import type { DashboardRepository } from '../../domain/ports/DashboardRepository'
import { selectDashboardSummary } from '../../domain/services/dashboardSummary'

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async load(today: string, upcomingLimit = 4, recentPaymentLimit = 5) {
    const snapshot = await this.repository.getSnapshot(recentPaymentLimit)
    return selectDashboardSummary(snapshot.bookings, snapshot.recentPayments, today, upcomingLimit)
  }
}
