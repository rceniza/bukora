import * as DocumentPicker from 'expo-document-picker'
import type { BackupFileGateway } from './backupFileGateway'

export class WebBackupFileGateway implements BackupFileGateway {
  async exportFile(contents: string): Promise<void> {
    const blob = new Blob([contents], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `bukora-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  async importFile(): Promise<string | null> {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', base64: true })
    if (result.canceled) return null
    const asset = result.assets[0]
    if (asset.file) return asset.file.text()
    if (!asset.base64) throw new Error('The selected file could not be read.')
    const bytes = Uint8Array.from(atob(asset.base64), (character) => character.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }
}

export const backupFileGateway: BackupFileGateway = new WebBackupFileGateway()
