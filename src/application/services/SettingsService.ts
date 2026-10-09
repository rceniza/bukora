import { z } from 'zod'
import { DEFAULT_APP_SETTINGS } from '../../domain/models/defaults'
import type { AppSettings } from '../../domain/models'
import type { SettingsRepository, SettingRecord } from '../../domain/ports/SettingsRepository'

export const appSettingsSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter an app name.').max(40, 'Use 40 characters or fewer.'),
  propertyName: z.string().trim().min(1, 'Enter a property name.').max(80, 'Use 80 characters or fewer.'),
  nightUseAmountMinor: z.number().int().nonnegative().safe(),
  additionalRoomAmountMinor: z.number().int().nonnegative().safe(),
  videokeRentalAmountMinor: z.number().int().nonnegative().safe(),
  confirmationDepositAmountMinor: z.number().int().nonnegative().safe().default(DEFAULT_APP_SETTINGS.confirmationDepositAmountMinor),
  currency: z.literal('PHP'),
})

const settingKeys = [
  'displayName',
  'propertyName',
  'nightUseAmountMinor',
  'additionalRoomAmountMinor',
  'videokeRentalAmountMinor',
  'confirmationDepositAmountMinor',
  'currency',
] as const satisfies readonly (keyof AppSettings)[]

export class SettingsService {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async load(): Promise<AppSettings> {
    const records = await Promise.all(settingKeys.map((key) => this.repository.get(key)))
    const values = new Map<string, string>(records.flatMap((record) => record ? [[record.key, record.value]] : []))
    const candidate = {
      displayName: values.get('displayName') ?? DEFAULT_APP_SETTINGS.displayName,
      propertyName: values.get('propertyName') ?? DEFAULT_APP_SETTINGS.propertyName,
      nightUseAmountMinor: Number(values.get('nightUseAmountMinor') ?? DEFAULT_APP_SETTINGS.nightUseAmountMinor),
      additionalRoomAmountMinor: Number(values.get('additionalRoomAmountMinor') ?? DEFAULT_APP_SETTINGS.additionalRoomAmountMinor),
      videokeRentalAmountMinor: Number(values.get('videokeRentalAmountMinor') ?? DEFAULT_APP_SETTINGS.videokeRentalAmountMinor),
      confirmationDepositAmountMinor: Number(values.get('confirmationDepositAmountMinor') ?? DEFAULT_APP_SETTINGS.confirmationDepositAmountMinor),
      currency: values.get('currency') ?? DEFAULT_APP_SETTINGS.currency,
    }
    const parsed = appSettingsSchema.safeParse(candidate)
    return parsed.success ? parsed.data : { ...DEFAULT_APP_SETTINGS }
  }

  async save(input: unknown): Promise<AppSettings> {
    const settings = appSettingsSchema.parse(input)
    const timestamp = this.now()
    const records: SettingRecord[] = settingKeys.map((key) => ({
      key,
      value: String(settings[key]),
      updatedAt: timestamp,
    }))
    await this.repository.setMany(records)
    return settings
  }
}
