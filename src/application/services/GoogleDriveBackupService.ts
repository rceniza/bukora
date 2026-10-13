import type { BackupDocument, BackupService } from './BackupService'

export interface GoogleDriveBackupFile {
  id: string
  version: string
  modifiedTime: string
}

export interface GoogleDriveBackupGateway {
  connect(): Promise<string>
  getConnectedAccount(): Promise<string | null>
  disconnect(): Promise<void>
  isOnline(): Promise<boolean>
  findBackup(): Promise<GoogleDriveBackupFile | null>
  readBackup(fileId: string): Promise<string>
  writeBackup(contents: string, fileId?: string): Promise<GoogleDriveBackupFile>
  getLastSyncedVersion(): Promise<string | null>
  setLastSyncedVersion(version: string | null): Promise<void>
  getLastBackupAt(): Promise<string | null>
  setLastBackupAt(value: string | null): Promise<void>
}

export interface CloudBackupPreview {
  document: BackupDocument
  file: GoogleDriveBackupFile
}

export class GoogleDriveBackupConflictError extends Error {
  constructor() {
    super('The Google Drive backup changed on another device. Restore it or explicitly replace it before continuing automatic backups.')
    this.name = 'GoogleDriveBackupConflictError'
  }
}

export class GoogleDriveBackupService {
  constructor(private readonly backups: BackupService, private readonly gateway: GoogleDriveBackupGateway) {}

  connect(): Promise<string> {
    return this.gateway.connect()
  }

  getConnectedAccount(): Promise<string | null> {
    return this.gateway.getConnectedAccount()
  }

  async disconnect(): Promise<void> {
    await this.gateway.disconnect()
    await this.gateway.setLastSyncedVersion(null)
    await this.gateway.setLastBackupAt(null)
  }

  async getLastBackupAt(): Promise<string | null> {
    return this.gateway.getLastBackupAt()
  }

  async uploadLatest(options: { replaceRemote?: boolean } = {}): Promise<GoogleDriveBackupFile> {
    if (!await this.gateway.isOnline()) throw new Error('Connect to the internet to back up to Google Drive.')

    const [currentFile, lastSyncedVersion] = await Promise.all([
      this.gateway.findBackup(),
      this.gateway.getLastSyncedVersion(),
    ])
    const hasChangedRemotely = currentFile
      ? currentFile.version !== lastSyncedVersion
      : lastSyncedVersion !== null

    if (hasChangedRemotely && !options.replaceRemote) throw new GoogleDriveBackupConflictError()

    const updatedFile = await this.gateway.writeBackup(await this.backups.export(), currentFile?.id)
    await this.gateway.setLastSyncedVersion(updatedFile.version)
    await this.gateway.setLastBackupAt(updatedFile.modifiedTime)
    return updatedFile
  }

  async previewCloudRestore(): Promise<CloudBackupPreview | null> {
    if (!await this.gateway.isOnline()) throw new Error('Connect to the internet to restore a Google Drive backup.')
    const file = await this.gateway.findBackup()
    if (!file) return null
    return { document: this.backups.parse(await this.gateway.readBackup(file.id)), file }
  }

  async restoreCloudBackup(preview: CloudBackupPreview): Promise<void> {
    await this.backups.restore(preview.document)
    await this.gateway.setLastSyncedVersion(preview.file.version)
    await this.gateway.setLastBackupAt(preview.file.modifiedTime)
  }
}
