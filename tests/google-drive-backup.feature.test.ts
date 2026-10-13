import migration from '../drizzle/0000_wandering_bulldozer.sql'
import { BackupService } from '../src/application/services/BackupService'
import { CreateBookingService } from '../src/application/services/CreateBookingService'
import { GoogleDriveBackupService } from '../src/application/services/GoogleDriveBackupService'
import type { GoogleDriveBackupFile, GoogleDriveBackupGateway } from '../src/application/services/GoogleDriveBackupService'
import { SqliteBackupStorage } from '../src/data/repositories/SqliteBackupStorage'
import { SqliteBookingRepository } from '../src/data/repositories/sqlite/SqliteBookingRepository'
import { DEFAULT_APP_SETTINGS } from '../src/domain/models/defaults'
import type { UUID } from '../src/domain/models'
import { createMemorySqlite } from './support/memorySqlite'

describe('Google Drive backup feature', () => {
  it('uploads the local booking ledger and restores a validated remote snapshot', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const storage = new SqliteBackupStorage(client)
    const repository = new SqliteBookingRepository(client)
    const bookingService = new CreateBookingService(repository, {
      createId: (() => { let id = 0; return () => `b0000000-0000-4000-8000-${String(++id).padStart(12, '0')}` as UUID })(),
      now: () => '2026-10-13T10:00:00.000Z',
    })
    const remote = { file: null as GoogleDriveBackupFile | null, contents: '', version: null as string | null, at: null as string | null }
    const gateway: GoogleDriveBackupGateway = {
      connect: async () => 'owner@example.com', getConnectedAccount: async () => 'owner@example.com', disconnect: async () => {}, isOnline: async () => true,
      findBackup: async () => remote.file, readBackup: async () => remote.contents,
      writeBackup: async (contents, id) => {
        remote.contents = contents
        remote.file = { id: id ?? 'drive-backup', version: String(Number(remote.file?.version ?? 0) + 1), modifiedTime: '2026-10-13T10:00:00.000Z' }
        return remote.file
      },
      getLastSyncedVersion: async () => remote.version, setLastSyncedVersion: async (version) => { remote.version = version },
      getLastBackupAt: async () => remote.at, setLastBackupAt: async (at) => { remote.at = at },
    }
    const sync = new GoogleDriveBackupService(new BackupService(storage), gateway)
    try {
      await bookingService.create({ booking: { guestName: 'Drive Guest', cellphone: '+639171234567', checkInDate: '2026-11-01', checkOutDate: '2026-11-02' }, pricing: {} })
      await sync.uploadLatest()
      expect(JSON.parse(remote.contents).bookings).toHaveLength(1)

      await bookingService.create({ booking: { guestName: 'New local record', cellphone: '+639171234568', checkInDate: '2026-11-03', checkOutDate: '2026-11-04' }, pricing: {} })
      expect(await repository.listAll()).toHaveLength(2)
      const preview = await sync.previewCloudRestore()
      expect(preview?.document.bookings[0].booking.guestName).toBe('Drive Guest')
      await sync.restoreCloudBackup(preview!)
      expect((await repository.listAll()).map(({ booking }) => booking.guestName)).toEqual(['Drive Guest'])
      expect(remote.version).toBe(remote.file?.version)
    } finally { database.close() }
  })

  it('does not overwrite local records when a cloud backup is invalid', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const storage = new SqliteBackupStorage(client)
    const repository = new SqliteBookingRepository(client)
    let id = 0
    await new CreateBookingService(repository, { createId: () => `c0000000-0000-4000-8000-${String(++id).padStart(12, '0')}` as UUID, now: () => '2026-10-13T10:00:00.000Z' }).create({ booking: { guestName: 'Keep local', cellphone: '+639171234567', checkInDate: '2026-11-01', checkOutDate: '2026-11-02' }, pricing: {} })
    const gateway: GoogleDriveBackupGateway = {
      connect: async () => '', getConnectedAccount: async () => null, disconnect: async () => {}, isOnline: async () => true,
      findBackup: async () => ({ id: 'id', version: '1', modifiedTime: '2026-10-13T10:00:00.000Z' }), readBackup: async () => '{bad json',
      writeBackup: async () => { throw new Error('unexpected write') }, getLastSyncedVersion: async () => null, setLastSyncedVersion: async () => {},
      getLastBackupAt: async () => null, setLastBackupAt: async () => {},
    }
    try {
      const sync = new GoogleDriveBackupService(new BackupService(storage), gateway)
      await expect(sync.previewCloudRestore()).rejects.toThrow('This file is not valid JSON.')
      expect((await repository.listAll()).map(({ booking }) => booking.guestName)).toEqual(['Keep local'])
    } finally { database.close() }
  })
})
