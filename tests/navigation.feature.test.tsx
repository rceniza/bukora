import { Text } from 'react-native'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import MainTabsLayout from '../app/(tabs)/_layout'

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))

const destination = (label: string) => () => <Text>{label} section</Text>

describe('main tab navigation', () => {
  it('keeps the four main sections reachable from every tab', () => {
    renderRouter({
      '(tabs)/_layout': MainTabsLayout,
      '(tabs)/index': destination('Dashboard'),
      '(tabs)/booking': destination('Bookings'),
      '(tabs)/payments': destination('Payments'),
      '(tabs)/settings': destination('Settings'),
    })

    expect(screen.getByText('Dashboard section')).toBeTruthy()
    for (const section of ['Bookings', 'Payments', 'Settings']) {
      fireEvent.press(screen.getByRole('button', { name: new RegExp(section) }))
      expect(screen.getByText(`${section} section`)).toBeTruthy()
    }
  })

})
