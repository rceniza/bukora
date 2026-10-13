import { BackupService } from '../src/application/services/BackupService'
import { GoogleDriveBackupConflictError, GoogleDriveBackupService } from '../src/application/services/GoogleDriveBackupService'
import type { GoogleDriveBackupFile, GoogleDriveBackupGateway } from '../src/application/services/GoogleDriveBackupService'
import { DEFAULT_APP_SETTINGS } from '../src/domain/models/defaults'

const file: GoogleDriveBackupFile = { id: 'drive-id', version: '2', modifiedTime: '2026-10-13T10:00:00.000Z' }

function setup() {
  const state = { settings: { ...DEFAULT_APP_SETTINGS }, bookings: [] as never[] }
  const storage = { load: async () => state, replace: async (backup: typeof state) => { Object.assign(state, backup) } }
  const backups = new BackupService(storage, () => '2026-10-13T10:00:00.000Z')
  const remote = { file: null as GoogleDriveBackupFile | null, contents: '', version: null as string | null, at: null as string | null, online: true }
  const gateway: GoogleDriveBackupGateway = {
    connect: async () => 'owner@example.com', getConnectedAccount: async () => 'owner@example.com', disconnect: async () => {},
    isOnline: async () => remote.online, findBackup: async () => remote.file,
    readBackup: async () => remote.contents,
    writeBackup: async (contents, id) => { remote.contents = contents; remote.file = { ...file, id: id ?? file.id, version: String(Number(remote.file?.version ?? 1) + 1) }; return remote.file },
    getLastSyncedVersion: async () => remote.version, setLastSyncedVersion: async (value) => { remote.version = value },
    getLastBackupAt: async () => remote.at, setLastBackupAt: async (value) => { remote.at = value },
  }
  return { state, remote, gateway, service: new GoogleDriveBackupService(backups, gateway) }
}

describe('Google Drive backup service', () => {
  it('creates an initial cloud backup and remembers its version', async () => {
    const { service, remote } = setup()
    const uploaded = await service.uploadLatest()
    expect(remote.file?.id).toBe('drive-id')
    expect(remote.version).toBe(uploaded.version)
    expect(await service.getLastBackupAt()).toBe(uploaded.modifiedTime)
    expect(JSON.parse(remote.contents).format).toBe('bukora-backup')
  })

  it('blocks automatic overwrite when Drive changed since the last sync', async () => {
    const { service, remote } = setup()
    remote.file = { ...file, version: '8' }
    remote.version = '7'
    await expect(service.uploadLatest()).rejects.toBeInstanceOf(GoogleDriveBackupConflictError)
    expect(remote.file.version).toBe('8')
  })

  it('permits an explicitly requested cloud replacement', async () => {
    const { service, remote } = setup()
    remote.file = { ...file, version: '8' }
    remote.version = '7'
    const updated = await service.uploadLatest({ replaceRemote: true })
    expect(updated.version).toBe('9')
    expect(remote.version).toBe('9')
  })

  it('refuses cloud actions while offline', async () => {
    const { service, remote } = setup()
    remote.online = false
    await expect(service.uploadLatest()).rejects.toThrow('Connect to the internet')
    await expect(service.previewCloudRestore()).rejects.toThrow('Connect to the internet')
  })

  it('validates Drive contents before restore and restores explicit preview', async () => {
    const { service, remote, state } = setup()
    remote.file = file
    remote.contents = JSON.stringify({ format: 'bukora-backup', version: 1, exportedAt: '2026-10-13T10:00:00.000Z', settings: { ...DEFAULT_APP_SETTINGS, displayName: 'Restored name' }, bookings: [] })
    const preview = await service.previewCloudRestore()
    expect(preview?.document.settings.displayName).toBe('Restored name')
    await service.restoreCloudBackup(preview!)
    expect(state.settings.displayName).toBe('Restored name')
    expect(remote.version).toBe(file.version)
    expect(await service.getLastBackupAt()).toBe(file.modifiedTime)
  })

  it('clears sync metadata after disconnect', async () => {
    const { service, remote } = setup()
    remote.version = '4'; remote.at = file.modifiedTime
    await service.disconnect()
    expect(remote.version).toBeNull()
    expect(remote.at).toBeNull()
  })
})
