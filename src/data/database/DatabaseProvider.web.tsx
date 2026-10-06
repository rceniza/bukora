import type { ReactNode } from 'react'
import { AppSettingsProvider } from '../../application/settings/AppSettingsContext'
import { SettingsService } from '../../application/services/SettingsService'
import { LocalStorageSettingsRepository } from '../repositories/web/LocalStorageSettingsRepository'

const settingsService = new SettingsService(new LocalStorageSettingsRepository())

export function DatabaseProvider({ children }: { children: ReactNode }) {
  return <AppSettingsProvider service={settingsService}>{children}</AppSettingsProvider>
}
