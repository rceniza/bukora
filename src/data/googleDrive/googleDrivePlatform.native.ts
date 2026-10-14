import Constants from 'expo-constants'
import * as Network from 'expo-network'
import * as SecureStore from 'expo-secure-store'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import { Platform } from 'react-native'
import type {
  GoogleDriveBackupFile,
  GoogleDriveBackupGateway,
} from '../../application/services/GoogleDriveBackupService'

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const BACKUP_MARKER_KEY = 'bukoraBackup'
const BACKUP_MARKER_VALUE = 'version-1'
const BACKUP_FILE_NAME = 'Bukora backup.json'
const LAST_SYNCED_VERSION_KEY = 'googleDriveBackupLastVersion'
const LAST_BACKUP_AT_KEY = 'googleDriveBackupLastAt'
const googleDriveConfig = Constants.expoConfig?.extra?.googleDrive as {
  webClientId?: string
  iosClientId?: string
} | undefined

let configured = false
let authQueue: Promise<void> = Promise.resolve()

// The native Google Sign-In bridge supports one auth operation at a time.
// Serialize calls across status checks, interactive sign-in, and Drive scopes.
function runAuthOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = authQueue.then(operation)
  authQueue = result.then(() => undefined, () => undefined)
  return result
}

function ensureConfigured(): void {
  if (configured) return
  if (!googleDriveConfig?.webClientId || (Platform.OS === 'ios' && !googleDriveConfig.iosClientId)) {
    throw new Error('Google Drive is not configured yet. Add the OAuth client IDs from your Google Cloud project and rebuild Bukora.')
  }
  GoogleSignin.configure({
    webClientId: googleDriveConfig.webClientId,
    ...(googleDriveConfig.iosClientId ? { iosClientId: googleDriveConfig.iosClientId } : {}),
    scopes: ['email'],
  })
  configured = true
}

function wasCancelled(result: { type: string }): boolean {
  return result.type === 'cancelled'
}

async function requestDriveAuthorization(): Promise<string> {
  ensureConfigured()
  return runAuthOperation(async () => {
    const result = await GoogleSignin.addScopes({ scopes: [DRIVE_FILE_SCOPE] })
    if (!result || wasCancelled(result)) throw new Error('Google Drive permission was not granted.')
    return (await GoogleSignin.getTokens()).accessToken
  })
}

async function responseError(response: Response): Promise<Error> {
  const message = await response.text().catch(() => '')
  return new Error(message ? `Google Drive request failed (${response.status}): ${message}` : `Google Drive request failed (${response.status}).`)
}

async function authenticatedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const firstToken = await requestDriveAuthorization()
  const firstResponse = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${firstToken}` },
  })
  if (firstResponse.status !== 401) return firstResponse

  await GoogleSignin.clearCachedAccessToken(firstToken)
  const freshToken = await requestDriveAuthorization()
  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${freshToken}` },
  })
}

interface GoogleDriveFileResponse {
  id: string
  version: string
  modifiedTime: string
}

function toBackupFile(file: GoogleDriveFileResponse): GoogleDriveBackupFile {
  return { id: file.id, version: String(file.version), modifiedTime: file.modifiedTime }
}

async function findBackup(): Promise<GoogleDriveBackupFile | null> {
  const query = new URLSearchParams({
    q: `appProperties has { key='${BACKUP_MARKER_KEY}' and value='${BACKUP_MARKER_VALUE}' } and trashed=false`,
    spaces: 'drive',
    pageSize: '1',
    fields: 'files(id,version,modifiedTime)',
  })
  const response = await authenticatedFetch(`https://www.googleapis.com/drive/v3/files?${query}`)
  if (!response.ok) throw await responseError(response)
  const result = await response.json() as { files?: GoogleDriveFileResponse[] }
  return result.files?.[0] ? toBackupFile(result.files[0]) : null
}

async function writeBackup(contents: string, fileId?: string): Promise<GoogleDriveBackupFile> {
  let response: Response
  if (fileId) {
    const query = new URLSearchParams({ uploadType: 'media', fields: 'id,version,modifiedTime' })
    response = await authenticatedFetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?${query}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: contents,
    })
  } else {
    const boundary = `bukora-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const metadata = JSON.stringify({
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      appProperties: { [BACKUP_MARKER_KEY]: BACKUP_MARKER_VALUE },
    })
    const multipart = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}`,
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${contents}`,
      `--${boundary}--`,
      '',
    ].join('\r\n')
    const query = new URLSearchParams({ uploadType: 'multipart', fields: 'id,version,modifiedTime' })
    response = await authenticatedFetch(`https://www.googleapis.com/upload/drive/v3/files?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    })
  }
  if (!response.ok) throw await responseError(response)
  return toBackupFile(await response.json() as GoogleDriveFileResponse)
}

export const googleDriveBackupGateway: GoogleDriveBackupGateway = {
  async connect() {
    ensureConfigured()
    return runAuthOperation(async () => {
      const account = await GoogleSignin.signIn()
      if (wasCancelled(account)) throw new Error('Google sign-in was cancelled.')
      const permission = await GoogleSignin.addScopes({ scopes: [DRIVE_FILE_SCOPE] })
      if (!permission || wasCancelled(permission) || !permission.data) throw new Error('Google Drive permission was not granted.')
      return permission.data.user.email
    })
  },

  async getConnectedAccount() {
    if (!googleDriveConfig?.webClientId || (Platform.OS === 'ios' && !googleDriveConfig.iosClientId)) return null
    ensureConfigured()
    if (!GoogleSignin.hasPreviousSignIn()) return null
    return runAuthOperation(async () => {
      const response = await GoogleSignin.signInSilently()
      return response.type === 'success' ? response.data.user.email : null
    })
  },

  async disconnect() {
    if (!configured) return
    await runAuthOperation(async () => {
      try { await GoogleSignin.revokeAccess() }
      finally { await GoogleSignin.signOut() }
    })
  },

  async isOnline() {
    const state = await Network.getNetworkStateAsync()
    return state.isInternetReachable === true || (state.isInternetReachable === null && state.isConnected === true)
  },

  findBackup,

  async readBackup(fileId) {
    const response = await authenticatedFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`)
    if (!response.ok) throw await responseError(response)
    return response.text()
  },

  writeBackup,

  getLastSyncedVersion: () => SecureStore.getItemAsync(LAST_SYNCED_VERSION_KEY),
  setLastSyncedVersion: (version) => version
    ? SecureStore.setItemAsync(LAST_SYNCED_VERSION_KEY, version)
    : SecureStore.deleteItemAsync(LAST_SYNCED_VERSION_KEY),
  getLastBackupAt: () => SecureStore.getItemAsync(LAST_BACKUP_AT_KEY),
  setLastBackupAt: (value) => value
    ? SecureStore.setItemAsync(LAST_BACKUP_AT_KEY, value)
    : SecureStore.deleteItemAsync(LAST_BACKUP_AT_KEY),
}
