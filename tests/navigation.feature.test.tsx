import { Text } from 'react-native'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import MainTabsLayout, { mainTabBarStyle } from '../app/(tabs)/_layout'

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))

const destination = (label: string) => () => <Text>{label} section</Text>

describe('main tab navigation', () => {
  it('lets the navigator add the Android bottom safe-area inset to the tab bar', () => {
    expect(mainTabBarStyle).not.toHaveProperty('paddingBottom')
  })

  it('keeps Dashboard, Bookings, and Settings reachable without a standalone Payments tab', () => {
    renderRouter({
      '(tabs)/_layout': MainTabsLayout,
      '(tabs)/index': destination('Dashboard'),
      '(tabs)/booking': destination('Bookings'),
      '(tabs)/settings': destination('Settings'),
    })

    expect(screen.getByText('Dashboard section')).toBeTruthy()
    for (const section of ['Bookings', 'Settings']) {
      fireEvent.press(screen.getByRole('button', { name: new RegExp(section) }))
      expect(screen.getByText(`${section} section`)).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: /Payments/ })).toBeNull()
  })

})
