import { render, screen } from '@testing-library/react-native'
import type { PropsWithChildren } from 'react'
import DashboardScreen from '../app/(tabs)/index'

jest.mock('expo-router', () => ({
  Link: ({ children }: PropsWithChildren) => children,
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: () => undefined,
}))

jest.mock('../src/data/repositories/notificationInbox', () => ({
  notificationInboxService: { listCurrent: jest.fn(async () => []), markAsRead: jest.fn(async () => undefined) },
}))

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))

describe('DashboardScreen', () => {
  it('shows the Bukora home screen and offline-first introduction', () => {
    render(<DashboardScreen />)

    expect(screen.getByLabelText('Bukora logo')).toBeTruthy()
    expect(screen.getByText('Bukora')).toBeTruthy()
    expect(screen.getByText('Keep every stay in view.')).toBeTruthy()
    expect(screen.getByLabelText('Add booking')).toBeTruthy()
    expect(screen.getByText('No bookings yet')).toBeTruthy()
    expect(screen.getByText(/stay on this device and are available offline/i)).toBeTruthy()
    expect(screen.getByText('₱0.00')).toBeTruthy()
    expect(screen.getByText('No payments recorded')).toBeTruthy()
  })
})
