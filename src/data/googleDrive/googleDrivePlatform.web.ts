import type { GoogleDriveBackupGateway } from '../../application/services/GoogleDriveBackupService'

const unavailable = async (): Promise<never> => {
  throw new Error('Google Drive backup is available in the installed Android and iOS apps.')
}

export const googleDriveBackupGateway: GoogleDriveBackupGateway = {
  connect: unavailable,
  getConnectedAccount: async () => null,
  disconnect: async () => undefined,
  isOnline: async () => false,
  findBackup: async () => null,
  readBackup: unavailable,
  writeBackup: unavailable,
  getLastSyncedVersion: async () => null,
  setLastSyncedVersion: async () => undefined,
  getLastBackupAt: async () => null,
  setLastBackupAt: async () => undefined,
}
