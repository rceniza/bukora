import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppSettings } from '../../domain/models'
import { DEFAULT_APP_SETTINGS } from '../../domain/models/defaults'
import type { SettingsService } from '../services/SettingsService'

interface AppSettingsContextValue {
  settings: AppSettings
  ready: boolean
  saveSettings: (settings: AppSettings) => Promise<AppSettings>
}

const missingService = async (): Promise<AppSettings> => {
  throw new Error('Settings storage is not available outside the app provider.')
}

const AppSettingsContext = createContext<AppSettingsContextValue>({
  settings: { ...DEFAULT_APP_SETTINGS },
  ready: true,
  saveSettings: missingService,
})

export function AppSettingsProvider({ service, children }: { service: SettingsService; children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_APP_SETTINGS })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    service.load().then((savedSettings) => {
      if (active) setSettings(savedSettings)
    }).catch(() => {
      // Defaults remain available when an optional settings read fails.
    }).finally(() => {
      if (active) setReady(true)
    })
    return () => { active = false }
  }, [service])

  const saveSettings = useCallback(async (nextSettings: AppSettings) => {
    const savedSettings = await service.save(nextSettings)
    setSettings(savedSettings)
    return savedSettings
  }, [service])

  return (
    <AppSettingsContext.Provider value={{ settings, ready, saveSettings }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings(): AppSettingsContextValue {
  return useContext(AppSettingsContext)
}
