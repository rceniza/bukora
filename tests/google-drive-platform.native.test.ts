jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { googleDrive: { webClientId: 'web-id' } } } } }))
jest.mock('expo-network', () => ({}))
jest.mock('expo-secure-store', () => ({}))
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }))

const mockGoogleSignin = {
  configure: jest.fn(),
  signIn: jest.fn(),
  signInSilently: jest.fn(),
  addScopes: jest.fn(),
  getTokens: jest.fn(),
  hasPreviousSignIn: jest.fn(),
  revokeAccess: jest.fn(),
  signOut: jest.fn(),
}

jest.mock('@react-native-google-signin/google-signin', () => ({ GoogleSignin: mockGoogleSignin }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('native Google Drive auth serialization', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    mockGoogleSignin.hasPreviousSignIn.mockReturnValue(true)
    mockGoogleSignin.signInSilently.mockResolvedValue({ type: 'success', data: { user: { email: 'owner@example.com' } } })
    mockGoogleSignin.signIn.mockResolvedValue({ type: 'success', data: { user: { email: 'owner@example.com' } } })
    mockGoogleSignin.addScopes.mockResolvedValue({ type: 'success', data: { user: { email: 'owner@example.com' } } })
    mockGoogleSignin.getTokens.mockResolvedValue({ accessToken: 'access-token' })
  })

  it('waits for silent account lookup before starting interactive sign-in', async () => {
    const silentSignIn = deferred<{ type: string; data: { user: { email: string } } }>()
    mockGoogleSignin.signInSilently.mockReturnValue(silentSignIn.promise)
    const { googleDriveBackupGateway } = require('../src/data/googleDrive/googleDrivePlatform.native')

    const statusLookup = googleDriveBackupGateway.getConnectedAccount()
    const interactiveConnect = googleDriveBackupGateway.connect()
    await Promise.resolve()
    expect(mockGoogleSignin.signInSilently).toHaveBeenCalledTimes(1)
    expect(mockGoogleSignin.signIn).not.toHaveBeenCalled()

    silentSignIn.resolve({ type: 'success', data: { user: { email: 'owner@example.com' } } })
    await expect(statusLookup).resolves.toBe('owner@example.com')
    await expect(interactiveConnect).resolves.toBe('owner@example.com')
    expect(mockGoogleSignin.signIn).toHaveBeenCalledTimes(1)
  })

  it('coalesces the platform queue after a failed auth operation', async () => {
    mockGoogleSignin.signInSilently.mockRejectedValueOnce(new Error('native auth failed'))
    const { googleDriveBackupGateway } = require('../src/data/googleDrive/googleDrivePlatform.native')

    await expect(googleDriveBackupGateway.getConnectedAccount()).rejects.toThrow('native auth failed')
    await expect(googleDriveBackupGateway.connect()).resolves.toBe('owner@example.com')
  })
})
