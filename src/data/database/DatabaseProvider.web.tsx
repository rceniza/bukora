import type { ReactNode } from 'react'
import { AppSettingsProvider } from '../../application/settings/AppSettingsContext'
import { BookingReminderProvider } from '../../application/settings/BookingReminderProvider'
import { GoogleDriveBackupProvider } from '../../application/settings/GoogleDriveBackupProvider'
import { SettingsService } from '../../application/services/SettingsService'
import { DashboardService } from '../../application/services/DashboardService'
import { DashboardProvider } from '../../application/dashboard/DashboardContext'
import { LocalStorageSettingsRepository } from '../repositories/web/LocalStorageSettingsRepository'
import { dashboardRepository } from '../repositories/dashboardRepository'

const settingsService = new SettingsService(new LocalStorageSettingsRepository())
const dashboardService = new DashboardService(dashboardRepository)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <AppSettingsProvider service={settingsService}>
      <GoogleDriveBackupProvider>
        <BookingReminderProvider>
          <DashboardProvider service={dashboardService}>{children}</DashboardProvider>
        </BookingReminderProvider>
      </GoogleDriveBackupProvider>
    </AppSettingsProvider>
  )
}
