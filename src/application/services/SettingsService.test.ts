import { DEFAULT_APP_SETTINGS } from '../../domain/models/defaults'
import type { SettingsRepository, SettingRecord } from '../../domain/ports/SettingsRepository'
import { SettingsService } from './SettingsService'

class MemorySettingsRepository implements SettingsRepository {
  values = new Map<string, SettingRecord>()

  async get(key: string): Promise<SettingRecord | null> {
    return this.values.get(key) ?? null
  }

  async set(record: SettingRecord): Promise<void> {
    this.values.set(record.key, record)
  }

  async setMany(records: SettingRecord[]): Promise<void> {
    records.forEach((record) => this.values.set(record.key, record))
  }
}

describe('SettingsService', () => {
  it('uses the Cenere defaults if there are no saved settings', async () => {
    const service = new SettingsService(new MemorySettingsRepository())
    expect(await service.load()).toEqual(DEFAULT_APP_SETTINGS)
  })

  it('persists validated owner settings and reloads them', async () => {
    const repository = new MemorySettingsRepository()
    const service = new SettingsService(repository, () => '2026-10-07T10:00:00.000Z')
    const updated = { ...DEFAULT_APP_SETTINGS, displayName: 'Cenere Bookings', nightUseAmountMinor: 600000 }

    await expect(service.save(updated)).resolves.toEqual(updated)
    await expect(service.load()).resolves.toEqual(updated)
    expect(repository.values.get('displayName')?.updatedAt).toBe('2026-10-07T10:00:00.000Z')
  })

  it('rejects empty names and invalid minor-unit prices', async () => {
    const service = new SettingsService(new MemorySettingsRepository())
    await expect(service.save({ ...DEFAULT_APP_SETTINGS, displayName: ' ' })).rejects.toThrow()
    await expect(service.save({ ...DEFAULT_APP_SETTINGS, videokeRentalAmountMinor: -1 })).rejects.toThrow()
  })
})
