import { render, screen } from '@testing-library/react-native'
import DashboardScreen from '../app/index'

describe('DashboardScreen', () => {
  it('shows the Bukora home screen and offline-first introduction', () => {
    render(<DashboardScreen />)

    expect(screen.getByText('Bukora')).toBeTruthy()
    expect(screen.getByText('Keep every stay in view.')).toBeTruthy()
    expect(screen.getByLabelText('Add booking')).toBeTruthy()
    expect(screen.getByText('No bookings yet')).toBeTruthy()
    expect(screen.getByText(/stay on this device and are available offline/i)).toBeTruthy()
    expect(screen.getByText('₱0.00')).toBeTruthy()
    expect(screen.getByText('No payments recorded')).toBeTruthy()
  })
})
