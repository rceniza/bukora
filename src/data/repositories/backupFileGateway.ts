import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

export interface BackupFileGateway {
  exportFile(contents: string): Promise<void>
  importFile(): Promise<string | null>
}

export class NativeBackupFileGateway implements BackupFileGateway {
  async exportFile(contents: string): Promise<void> {
    const file = new File(Paths.cache, `bukora-backup-${new Date().toISOString().slice(0, 10)}.json`)
    if (file.exists) file.delete()
    file.create()
    file.write(contents)
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save Bukora backup' })
  }

  async importFile(): Promise<string | null> {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })
    if (result.canceled) return null
    return new File(result.assets[0].uri).text()
  }
}

export const backupFileGateway: BackupFileGateway = new NativeBackupFileGateway()
