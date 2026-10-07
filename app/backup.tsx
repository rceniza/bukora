import { useMemo, useState } from 'react'
import { Link } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ErrorState } from '../components/ui/ErrorState'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { BackupService } from '../src/application/services/BackupService'
import type { BackupDocument } from '../src/application/services/BackupService'
import { useAppSettings } from '../src/application/settings/AppSettingsContext'
import { useDashboard } from '../src/application/dashboard/DashboardContext'
import { backupFileGateway } from '../src/data/repositories/backupFileGateway'
import { backupStorage } from '../src/data/repositories/backupStorage'

export default function BackupScreen() {
  const { saveSettings } = useAppSettings()
  const { refresh } = useDashboard()
  const service = useMemo(() => new BackupService(backupStorage), [])
  const [preview, setPreview] = useState<BackupDocument | null>(null)
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
      setNotice(`Restored ${preview.bookings.length} bookings and their payments and history.`)
      setPreview(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Backup could not be restored.') }
    finally { setBusy(false) }
  }

  return <SafeAreaView className="flex-1 bg-canvas"><ScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
    <View className="flex-row items-center justify-between"><View><Text className="text-3xl font-bold text-ink">Backup and restore</Text><Text className="mt-1 text-sm text-muted">Move your offline ledger to another device.</Text></View><Link href="/settings" accessibilityRole="button" className="rounded-full bg-white px-4 py-3 font-semibold text-ink">Done</Link></View>
    <SurfaceCard className="gap-4"><Text className="text-lg font-semibold text-ink">Create a backup</Text><Text className="text-sm leading-5 text-muted">Export a versioned JSON file containing bookings, guest details, price breakdowns, payments, change history, and app settings.</Text><PrimaryButton label={busy ? 'Working…' : 'Export backup file'} onPress={() => void exportBackup()} disabled={busy} /></SurfaceCard>
    <SurfaceCard className="gap-4"><Text className="text-lg font-semibold text-ink">Restore a backup</Text><Text className="text-sm leading-5 text-muted">Choose a Bukora JSON backup. We’ll validate it and show what it contains before changing any records.</Text><PrimaryButton label={busy ? 'Working…' : 'Choose backup file'} onPress={() => void chooseBackup()} disabled={busy} />
      {preview ? <View className="gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4"><Text className="font-semibold text-amber-950">Review before replacing local data</Text><Text className="text-sm leading-5 text-amber-900">This backup from {new Date(preview.exportedAt).toLocaleString()} contains {preview.bookings.length} bookings. Restoring will replace all bookings, payment records, activity history, and settings currently on this device.</Text><Text className="text-sm font-medium text-amber-900">Export your current data first if you may need it later.</Text><PrimaryButton label={busy ? 'Restoring…' : 'Replace all local data'} onPress={() => void restoreBackup()} disabled={busy} /><Text accessibilityRole="button" onPress={() => setPreview(null)} className="text-center font-semibold text-muted">Cancel restore</Text></View> : null}
    </SurfaceCard>
    {error ? <ErrorState message={error} /> : null}{notice ? <SurfaceCard><Text accessibilityRole="alert" className="text-sm font-medium text-cenere-700">{notice}</Text></SurfaceCard> : null}
  </ScrollView></SafeAreaView>
}
