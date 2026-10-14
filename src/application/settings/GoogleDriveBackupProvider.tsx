import { AppState } from 'react-native'
import * as Network from 'expo-network'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BackupService } from '../services/BackupService'
import type { CloudBackupPreview } from '../services/GoogleDriveBackupService'
import { GoogleDriveBackupService } from '../services/GoogleDriveBackupService'
import { useAppSettings } from './AppSettingsContext'

interface GoogleDriveBackupContextValue {
  accountEmail: string | null
  autoBackupEnabled: boolean
  lastBackupAt: string | null
  syncing: boolean
  error: string
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  setAutoBackupEnabled: (enabled: boolean) => Promise<void>
  syncNow: (replaceRemote?: boolean) => Promise<void>
  queueBackup: () => void
  previewCloudRestore: () => Promise<CloudBackupPreview | null>
  restoreCloudBackup: (preview: CloudBackupPreview) => Promise<void>
}

const unavailableDriveBackup: GoogleDriveBackupContextValue = {
  accountEmail: null,
  autoBackupEnabled: false,
  lastBackupAt: null,
  syncing: false,
  error: '',
  connect: async () => { throw new Error('Google Drive provider is unavailable.') },
  disconnect: async () => undefined,
  setAutoBackupEnabled: async () => undefined,
  syncNow: async () => undefined,
  queueBackup: () => undefined,
  previewCloudRestore: async () => null,
  restoreCloudBackup: async () => undefined,
}

const GoogleDriveBackupContext = createContext<GoogleDriveBackupContextValue>(unavailableDriveBackup)

export function GoogleDriveBackupProvider({ children }: { children: ReactNode }) {
  const { settings, ready: settingsReady, saveSettings } = useAppSettings()
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const syncingRef = useRef(false)
  const authInProgressRef = useRef(false)
  const statusRefreshRef = useRef<Promise<void> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const servicePromiseRef = useRef<Promise<GoogleDriveBackupService> | null>(null)
  const autoBackupEnabled = settings.googleDriveAutoBackupEnabled

  const getService = useCallback(() => {
    if (!servicePromiseRef.current) {
      servicePromiseRef.current = Promise.all([
        import('../../data/repositories/backupStorage'),
        import('../../data/googleDrive/googleDrivePlatform'),
      ]).then(([{ backupStorage }, { googleDriveBackupGateway }]) => (
        new GoogleDriveBackupService(new BackupService(backupStorage), googleDriveBackupGateway)
      ))
    }
    return servicePromiseRef.current
  }, [])

  const refreshCloudStatus = useCallback(async () => {
    if (authInProgressRef.current) return
    if (statusRefreshRef.current) return statusRefreshRef.current
    const refresh = (async () => {
      try {
        const service = await getService()
        const [account, lastBackup] = await Promise.all([service.getConnectedAccount(), service.getLastBackupAt()])
        setAccountEmail(account)
        setLastBackupAt(lastBackup)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Google Drive status could not be checked.')
      }
    })()
    statusRefreshRef.current = refresh
    try { await refresh }
    finally { if (statusRefreshRef.current === refresh) statusRefreshRef.current = null }
  }, [getService])

  const syncNow = useCallback(async (replaceRemote = false) => {
    if (!settingsReady || syncingRef.current) return
    if (!accountEmail) {
      setError('Connect Google Drive before backing up.')
      return
    }
    syncingRef.current = true
    setSyncing(true)
    setError('')
    try {
      const service = await getService()
      const file = await service.uploadLatest({ replaceRemote })
      setLastBackupAt(file.modifiedTime)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google Drive backup could not be updated.')
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [accountEmail, getService, settingsReady])

  const queueBackup = useCallback(() => {
    if (!accountEmail || !autoBackupEnabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void syncNow() }, 1200)
  }, [accountEmail, autoBackupEnabled, syncNow])

  const connect = useCallback(async () => {
    if (authInProgressRef.current) return
    authInProgressRef.current = true
    setError('')
    try {
      const service = await getService()
      const email = await service.connect()
      setAccountEmail(email)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google Drive could not be connected.')
      throw cause
    } finally {
      authInProgressRef.current = false
    }
  }, [getService])

  const disconnect = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setError('')
    try {
      const service = await getService()
      await service.disconnect()
      setAccountEmail(null)
      setLastBackupAt(null)
      if (settings.googleDriveAutoBackupEnabled) {
        await saveSettings({ ...settings, googleDriveAutoBackupEnabled: false })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google Drive could not be disconnected.')
      throw cause
    }
  }, [getService, saveSettings, settings])

  const setAutoBackupEnabled = useCallback(async (enabled: boolean) => {
    if (enabled && !accountEmail) throw new Error('Connect Google Drive before enabling automatic backups.')
    await saveSettings({ ...settings, googleDriveAutoBackupEnabled: enabled })
    if (enabled) setTimeout(() => { void syncNow() }, 0)
  }, [accountEmail, saveSettings, settings, syncNow])

  const previewCloudRestore = useCallback(async () => {
    const service = await getService()
    return service.previewCloudRestore()
  }, [getService])

  const restoreCloudBackup = useCallback(async (preview: CloudBackupPreview) => {
    const service = await getService()
    await service.restoreCloudBackup(preview)
    setLastBackupAt(preview.file.modifiedTime)
    setError('')
  }, [getService])

  useEffect(() => {
    if (settingsReady) void refreshCloudStatus()
  }, [refreshCloudStatus, settingsReady])

  useEffect(() => {
    if (settingsReady && autoBackupEnabled && accountEmail) queueBackup()
  }, [accountEmail, autoBackupEnabled, queueBackup, settings, settingsReady])

  useEffect(() => {
    const subscription = Network.addNetworkStateListener((networkState) => {
      if (networkState.isInternetReachable === true && autoBackupEnabled && accountEmail) queueBackup()
    })
    return () => subscription.remove()
  }, [accountEmail, autoBackupEnabled, queueBackup])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !authInProgressRef.current) {
        void refreshCloudStatus().then(() => {
          if (autoBackupEnabled) queueBackup()
        })
      }
    })
    return () => subscription.remove()
  }, [autoBackupEnabled, queueBackup, refreshCloudStatus])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const value = useMemo<GoogleDriveBackupContextValue>(() => ({
    accountEmail,
    autoBackupEnabled,
    lastBackupAt,
    syncing,
    error,
    connect,
    disconnect,
    setAutoBackupEnabled,
    syncNow,
    queueBackup,
    previewCloudRestore,
    restoreCloudBackup,
  }), [accountEmail, autoBackupEnabled, connect, disconnect, error, lastBackupAt, previewCloudRestore,
    queueBackup, restoreCloudBackup, setAutoBackupEnabled, syncing, syncNow])

  return <GoogleDriveBackupContext.Provider value={value}>{children}</GoogleDriveBackupContext.Provider>
}

export function useGoogleDriveBackup(): GoogleDriveBackupContextValue {
  return useContext(GoogleDriveBackupContext)
}
