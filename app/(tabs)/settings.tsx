import { useEffect, useState } from 'react'
import { Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ActivityIndicator, Text, View } from 'react-native'
import { AppTextField } from '../../components/ui/AppTextField'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SurfaceCard } from '../../components/ui/SurfaceCard'
import { appSettingsSchema } from '../../src/application/services/SettingsService'
import { useAppSettings } from '../../src/application/settings/AppSettingsContext'
import type { AppSettings } from '../../src/domain/models'
import { parsePHPAmountInput } from '../../src/shared/utils/moneyInput'
import { FormScrollView } from '../../components/forms/FormScrollView'

interface SettingsDraft {
  displayName: string
  propertyName: string
  nightUseAmount: string
  additionalRoomAmount: string
  videokeRentalAmount: string
  confirmationDepositAmount: string
}

function toDraft(settings: AppSettings): SettingsDraft {
  return {
    displayName: settings.displayName,
    propertyName: settings.propertyName,
    nightUseAmount: (settings.nightUseAmountMinor / 100).toFixed(2),
    additionalRoomAmount: (settings.additionalRoomAmountMinor / 100).toFixed(2),
    videokeRentalAmount: (settings.videokeRentalAmountMinor / 100).toFixed(2),
    confirmationDepositAmount: (settings.confirmationDepositAmountMinor / 100).toFixed(2),
  }
}

export default function SettingsScreen() {
  const { settings, ready, saveSettings } = useAppSettings()
  const [draft, setDraft] = useState(() => toDraft(settings))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => setDraft(toDraft(settings)), [settings])

  function updateDraft<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    setNotice('')
  }

  async function handleSave() {
    const nightUseAmountMinor = parsePHPAmountInput(draft.nightUseAmount)
    const additionalRoomAmountMinor = parsePHPAmountInput(draft.additionalRoomAmount)
    const videokeRentalAmountMinor = parsePHPAmountInput(draft.videokeRentalAmount)
    const confirmationDepositAmountMinor = parsePHPAmountInput(draft.confirmationDepositAmount)
    if (nightUseAmountMinor === null || additionalRoomAmountMinor === null || videokeRentalAmountMinor === null || confirmationDepositAmountMinor === null) {
      setErrors({
        nightUseAmount: nightUseAmountMinor === null ? 'Enter a PHP amount with up to two decimal places.' : '',
        additionalRoomAmount: additionalRoomAmountMinor === null ? 'Enter a PHP amount with up to two decimal places.' : '',
        videokeRentalAmount: videokeRentalAmountMinor === null ? 'Enter a PHP amount with up to two decimal places.' : '',
        confirmationDepositAmount: confirmationDepositAmountMinor === null ? 'Enter a PHP amount with up to two decimal places.' : '',
      })
      return
    }

    const parsed = appSettingsSchema.safeParse({
      ...settings,
      displayName: draft.displayName,
      propertyName: draft.propertyName,
      nightUseAmountMinor,
      additionalRoomAmountMinor,
      videokeRentalAmountMinor,
      confirmationDepositAmountMinor,
    })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const key = String(issue.path[0] ?? 'displayName')
      setErrors({ [key]: issue.message })
      return
    }

    setSaving(true)
    try {
      await saveSettings(parsed.data)
      setErrors({})
      setNotice('Settings saved on this device.')
    } catch {
      setNotice('Settings could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <FormScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-6 px-5 py-6">
        <View className="gap-1">
            <Text className="text-3xl font-bold text-ink">Settings</Text>
            <Text className="text-sm text-muted">Set your display name and booking rates.</Text>
        </View>

        {!ready ? (
          <View className="items-center gap-3 py-10">
            <ActivityIndicator accessibilityLabel="Loading settings" />
            <Text className="text-sm text-muted">Loading saved settings…</Text>
          </View>
        ) : <>
        <SurfaceCard className="gap-5">
          <SectionHeading title="Names" />
          <AppTextField
            label="App name"
            value={draft.displayName}
            onChangeText={(value) => updateDraft('displayName', value)}
            error={errors.displayName}
            maxLength={40}
            autoCapitalize="words"
          />
          <AppTextField
            label="Property name"
            value={draft.propertyName}
            onChangeText={(value) => updateDraft('propertyName', value)}
            error={errors.propertyName}
            maxLength={80}
            autoCapitalize="words"
          />
        </SurfaceCard>

        <SurfaceCard className="gap-5">
          <SectionHeading title="Default prices" />
          <Text className="-mt-3 text-sm leading-5 text-muted">New bookings use these rates. Existing bookings keep their saved price breakdown.</Text>
          <Text className="-mt-2 text-sm font-medium text-muted">Currency · Philippine peso (PHP)</Text>
          <AppTextField
            label="Night-use package (PHP)"
            value={draft.nightUseAmount}
            onChangeText={(value) => updateDraft('nightUseAmount', value)}
            error={errors.nightUseAmount}
            keyboardType="decimal-pad"
          />
          <AppTextField
            label="Second room (PHP)"
            value={draft.additionalRoomAmount}
            onChangeText={(value) => updateDraft('additionalRoomAmount', value)}
            error={errors.additionalRoomAmount}
            keyboardType="decimal-pad"
          />
          <AppTextField
            label="Videoke rental with one room (PHP)"
            value={draft.videokeRentalAmount}
            onChangeText={(value) => updateDraft('videokeRentalAmount', value)}
            error={errors.videokeRentalAmount}
            keyboardType="decimal-pad"
          />
          <AppTextField
            label="Initial payment required to confirm (PHP)"
            value={draft.confirmationDepositAmount}
            onChangeText={(value) => updateDraft('confirmationDepositAmount', value)}
            error={errors.confirmationDepositAmount}
            keyboardType="decimal-pad"
            helper="New bookings stay tentative until payments reach this amount. Changes apply to new bookings only."
          />
          <PrimaryButton label="Save settings" loading={saving} onPress={handleSave} />
          {notice ? <Text className="text-center text-sm text-muted" accessibilityLiveRegion="polite">{notice}</Text> : null}
        </SurfaceCard>
        <SurfaceCard className="gap-3">
          <SectionHeading title="Data safety" />
          <Text className="text-sm leading-5 text-muted">Create a portable backup of your bookings, payments, settings, and activity history.</Text>
          <Link href="/backup" accessibilityRole="button" className="rounded-2xl border border-cenere-600 px-4 py-3 text-center font-semibold text-cenere-700">
            Backup and restore
          </Link>
        </SurfaceCard>
        </>}
      </FormScrollView>
    </SafeAreaView>
  )
}
