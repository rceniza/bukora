import { ActivityIndicator, Text, View } from 'react-native'
import type { ReactNode } from 'react'
import { useDatabaseMigrations } from './useDatabaseMigrations'
import { AppSettingsProvider } from '../../application/settings/AppSettingsContext'
import { SettingsService } from '../../application/services/SettingsService'
import { DashboardService } from '../../application/services/DashboardService'
import { DashboardProvider } from '../../application/dashboard/DashboardContext'
import { settingsRepository } from '../repositories'
import { dashboardRepository } from '../repositories/dashboardRepository'

const settingsService = new SettingsService(settingsRepository)
const dashboardService = new DashboardService(dashboardRepository)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { success, error } = useDatabaseMigrations()

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas p-6">
        <Text className="text-center text-ink">Unable to open the local booking database: {error.message}</Text>
      </View>
    )
  }

  if (!success) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas">
        <ActivityIndicator accessibilityLabel="Preparing local database" />
        <Text className="text-muted">Preparing your offline booking ledger…</Text>
      </View>
    )
  }

  return (
    <AppSettingsProvider service={settingsService}>
      <DashboardProvider service={dashboardService}>{children}</DashboardProvider>
    </AppSettingsProvider>
  )
}
