import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { PropsWithChildren } from 'react'
import { DEFAULT_APP_SETTINGS } from '../src/domain/models/defaults'
import BackupScreen from '../app/backup'

const mockState = {
  restoreCloudBackup: jest.fn(async () => undefined),
  previewCloudRestore: jest.fn(),
  saveSettings: jest.fn(async () => undefined),
  refresh: jest.fn(async () => undefined),
}

jest.mock('expo-router', () => ({ Link: ({ children }: PropsWithChildren) => children, useRouter: () => ({ back: jest.fn() }) }))
jest.mock('../src/application/settings/AppSettingsContext', () => ({ useAppSettings: () => ({ saveSettings: mockState.saveSettings }) }))
jest.mock('../src/application/dashboard/DashboardContext', () => ({ useDashboard: () => ({ refresh: mockState.refresh }) }))
jest.mock('../src/application/settings/BookingReminderProvider', () => ({ useBookingReminders: () => ({ refresh: mockState.refresh }) }))
jest.mock('../src/application/settings/GoogleDriveBackupProvider', () => ({ useGoogleDriveBackup: () => ({
  accountEmail: 'owner@example.com', autoBackupEnabled: false, lastBackupAt: null, syncing: false, error: '',
  connect: jest.fn(), disconnect: jest.fn(), setAutoBackupEnabled: jest.fn(), syncNow: jest.fn(), queueBackup: jest.fn(),
  previewCloudRestore: mockState.previewCloudRestore, restoreCloudBackup: mockState.restoreCloudBackup,
}) }))
jest.mock('../src/data/repositories/backupStorage', () => ({ backupStorage: {} }))
jest.mock('../src/data/repositories/backupFileGateway', () => ({ backupFileGateway: {} }))

const preview = {
  document: { format: 'bukora-backup' as const, version: 1 as const, exportedAt: '2026-10-13T10:00:00.000Z', settings: DEFAULT_APP_SETTINGS, bookings: [] },
  file: { id: 'drive-file', version: '2', modifiedTime: '2026-10-13T10:00:00.000Z' },
}

describe('Google Drive restore screen feature', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockState.previewCloudRestore.mockResolvedValue(preview)
  })

  it('shows a review before restore and preserves local data when restore is cancelled', async () => {
    render(<BackupScreen />)
    fireEvent.press(screen.getByText('Restore from Google Drive'))
    expect(await screen.findByText('Review Google Drive backup')).toBeTruthy()
    fireEvent.press(screen.getByText('Cancel restore'))
    await waitFor(() => expect(screen.queryByText('Review Google Drive backup')).toBeNull())
    expect(mockState.restoreCloudBackup).not.toHaveBeenCalled()
  })

  it('restores only after the owner confirms replacing local data', async () => {
    render(<BackupScreen />)
    fireEvent.press(screen.getByText('Restore from Google Drive'))
    fireEvent.press(await screen.findByText('Replace local data from Drive'))
    await waitFor(() => expect(mockState.restoreCloudBackup).toHaveBeenCalledWith(preview))
    expect(mockState.saveSettings).toHaveBeenCalledWith(DEFAULT_APP_SETTINGS)
    expect(await screen.findByText('Restored 0 bookings from Google Drive.')).toBeTruthy()
  })
})
