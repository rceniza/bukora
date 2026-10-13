import { useMemo, useState } from 'react'
import { Platform, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ErrorState } from '../components/ui/ErrorState'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { BackupService } from '../src/application/services/BackupService'
import type { BackupDocument } from '../src/application/services/BackupService'
import { useAppSettings } from '../src/application/settings/AppSettingsContext'
import { useDashboard } from '../src/application/dashboard/DashboardContext'
import { useBookingReminders } from '../src/application/settings/BookingReminderProvider'
import { backupFileGateway } from '../src/data/repositories/backupFileGateway'
import { backupStorage } from '../src/data/repositories/backupStorage'
import { BackButton } from '../components/navigation/BackButton'
import { useGoogleDriveBackup } from '../src/application/settings/GoogleDriveBackupProvider'
import type { CloudBackupPreview } from '../src/application/services/GoogleDriveBackupService'

export default function BackupScreen() {
  const { saveSettings } = useAppSettings()
  const { refresh } = useDashboard()
  const { refresh: refreshReminders } = useBookingReminders()
  const cloud = useGoogleDriveBackup()
  const service = useMemo(() => new BackupService(backupStorage), [])
  const [preview, setPreview] = useState<BackupDocument | null>(null)
  const [cloudPreview, setCloudPreview] = useState<CloudBackupPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function exportBackup() {
    setBusy(true); setError(''); setNotice('')
    try {
      await backupFileGateway.exportFile(await service.export())
      setNotice('Backup file created. Keep a copy somewhere separate from this device.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Backup could not be exported.') }
    finally { setBusy(false) }
  }

  async function chooseBackup() {
    setBusy(true); setError(''); setNotice(''); setPreview(null)
    try {
      const contents = await backupFileGateway.importFile()
      if (contents !== null) setPreview(service.parse(contents))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The backup could not be read.') }
    finally { setBusy(false) }
  }

  async function restoreBackup() {
    if (!preview) return
    setBusy(true); setError(''); setNotice('')
    try {
      await service.restore(preview)
      await saveSettings(preview.settings)
      await refresh()
      await refreshReminders()
      cloud.queueBackup()
      setNotice(`Restored ${preview.bookings.length} bookings and their payments and history.`)
      setPreview(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Backup could not be restored.') }
    finally { setBusy(false) }
  }

  async function connectDrive() {
    setBusy(true); setError(''); setNotice('')
    try { await cloud.connect(); setNotice('Google Drive connected.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Google Drive could not be connected.') }
    finally { setBusy(false) }
  }

  async function disconnectDrive() {
    setBusy(true); setError(''); setNotice('')
    try { await cloud.disconnect(); setNotice('Google Drive disconnected.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Google Drive could not be disconnected.') }
    finally { setBusy(false) }
  }

  async function previewDriveRestore() {
    setBusy(true); setError(''); setNotice(''); setCloudPreview(null)
    try {
      const result = await cloud.previewCloudRestore()
      if (result) setCloudPreview(result)
      else setNotice('No Bukora backup was found in this Google Drive account.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Google Drive backup could not be read.') }
    finally { setBusy(false) }
  }

  async function restoreDriveBackup() {
    if (!cloudPreview) return
    setBusy(true); setError(''); setNotice('')
    try {
      await cloud.restoreCloudBackup(cloudPreview)
      await saveSettings(cloudPreview.document.settings)
      await refresh(); await refreshReminders()
      setNotice(`Restored ${cloudPreview.document.bookings.length} bookings from Google Drive.`)
      setCloudPreview(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Google Drive backup could not be restored.') }
    finally { setBusy(false) }
  }

  async function replaceDriveBackup() {
    setBusy(true); setError(''); setNotice('')
    await cloud.syncNow(true)
    setBusy(false)
    if (!cloud.error) setNotice('Google Drive backup replaced with this device’s data.')
  }

  return <SafeAreaView className="flex-1 bg-canvas"><ScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
    <View className="flex-row items-center justify-between"><View><Text className="text-3xl font-bold text-ink">Backup and restore</Text><Text className="mt-1 text-sm text-muted">Move your offline ledger to another device.</Text></View><BackButton label="Settings" fallback="/settings" /></View>
    <SurfaceCard className="gap-4"><Text className="text-lg font-semibold text-ink">Create a backup</Text><Text className="text-sm leading-5 text-muted">Export a versioned JSON file containing bookings, guest details, price breakdowns, payments, change history, and app settings.</Text><PrimaryButton label={busy ? 'Working…' : 'Export backup file'} onPress={() => void exportBackup()} disabled={busy} /></SurfaceCard>
    <SurfaceCard className="gap-4"><Text className="text-lg font-semibold text-ink">Google Drive backup</Text>
      <Text className="text-sm leading-5 text-muted">Keep an automatic copy in your Google Drive. Bukora still stores and uses bookings locally. Restoring from Drive requires your review.</Text>
      {Platform.OS === 'web' ? <Text className="text-sm text-muted">Google Drive connection is available in the installed Android and iOS apps.</Text> : cloud.accountEmail ? <Text className="text-sm font-medium text-ink">Connected as {cloud.accountEmail}</Text> : <PrimaryButton label={busy ? 'Working…' : 'Connect Google Drive'} onPress={() => void connectDrive()} disabled={busy} />}
      {cloud.accountEmail ? <>
        <View className="flex-row items-center justify-between"><Text className="flex-1 text-sm text-ink">Automatic backup after changes and when online</Text><Switch accessibilityLabel="Automatic Google Drive backup" value={cloud.autoBackupEnabled} onValueChange={(enabled) => void cloud.setAutoBackupEnabled(enabled).catch((cause) => setError(cause.message))} disabled={busy} /></View>
        <Text className="text-xs text-muted">{cloud.lastBackupAt ? `Last backup: ${new Date(cloud.lastBackupAt).toLocaleString()}` : 'No Drive backup yet.'}</Text>
        <PrimaryButton label={cloud.syncing || busy ? 'Working…' : 'Back up to Drive now'} onPress={() => void cloud.syncNow()} disabled={busy || cloud.syncing} />
        <PrimaryButton label="Restore from Google Drive" onPress={() => void previewDriveRestore()} disabled={busy || cloud.syncing} />
        <Text accessibilityRole="button" onPress={() => void disconnectDrive()} className="text-center font-semibold text-muted">Disconnect Google Drive</Text>
        {cloud.error.includes('changed on another device') ? <View className="gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4"><Text className="font-semibold text-amber-950">Drive has a newer backup</Text><Text className="text-sm text-amber-900">Review and restore that backup, or deliberately replace it with this device’s data.</Text><PrimaryButton label="Replace Drive backup with this device" onPress={() => void replaceDriveBackup()} disabled={busy} /></View> : null}
      </> : null}
      {cloud.error ? <Text accessibilityRole="alert" className="text-sm text-red-700">{cloud.error}</Text> : null}
      {cloudPreview ? <View className="gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4"><Text className="font-semibold text-amber-950">Review Google Drive backup</Text><Text className="text-sm leading-5 text-amber-900">Backup from {new Date(cloudPreview.document.exportedAt).toLocaleString()} contains {cloudPreview.document.bookings.length} bookings. Restoring replaces all records and settings on this device.</Text><PrimaryButton label="Replace local data from Drive" onPress={() => void restoreDriveBackup()} disabled={busy} /><Text accessibilityRole="button" onPress={() => setCloudPreview(null)} className="text-center font-semibold text-muted">Cancel restore</Text></View> : null}
    </SurfaceCard>
    <SurfaceCard className="gap-4"><Text className="text-lg font-semibold text-ink">Restore a backup</Text><Text className="text-sm leading-5 text-muted">Choose a Bukora JSON backup. We’ll validate it and show what it contains before changing any records.</Text><PrimaryButton label={busy ? 'Working…' : 'Choose backup file'} onPress={() => void chooseBackup()} disabled={busy} />
      {preview ? <View className="gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4"><Text className="font-semibold text-amber-950">Review before replacing local data</Text><Text className="text-sm leading-5 text-amber-900">This backup from {new Date(preview.exportedAt).toLocaleString()} contains {preview.bookings.length} bookings. Restoring will replace all bookings, payment records, activity history, and settings currently on this device.</Text><Text className="text-sm font-medium text-amber-900">Export your current data first if you may need it later.</Text><PrimaryButton label={busy ? 'Restoring…' : 'Replace all local data'} onPress={() => void restoreBackup()} disabled={busy} /><Text accessibilityRole="button" onPress={() => setPreview(null)} className="text-center font-semibold text-muted">Cancel restore</Text></View> : null}
    </SurfaceCard>
    {error ? <ErrorState message={error} /> : null}{notice ? <SurfaceCard><Text accessibilityRole="alert" className="text-sm font-medium text-cenere-700">{notice}</Text></SurfaceCard> : null}
  </ScrollView></SafeAreaView>
}
