import { render, screen } from '@testing-library/react-native'
import DashboardScreen from '../app/index'

describe('DashboardScreen', () => {
  it('shows the Bukora home screen and offline-first introduction', () => {
    render(<DashboardScreen />)

    expect(screen.getByText('Bukora')).toBeTruthy()
    expect(screen.getByText('Keep every stay in view.')).toBeTruthy()
    expect(screen.getByText('No bookings yet')).toBeTruthy()
    expect(screen.getByText(/stores its records on this device and works offline/i)).toBeTruthy()
    expect(screen.getByText('₱0.00')).toBeTruthy()
  })
})
