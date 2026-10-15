import { Text } from 'react-native'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import MainTabsLayout, { ANDROID_MIN_NAVIGATION_INSET, getMainTabBarStyle, mainTabBarStyle } from '../app/(tabs)/_layout'

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))

const destination = (label: string) => () => <Text>{label} section</Text>

describe('main tab navigation', () => {
  it('reserves the Android system navigation area below all main tabs', () => {
    expect(mainTabBarStyle).not.toHaveProperty('paddingBottom')
    expect(getMainTabBarStyle('android', 0)).toMatchObject({ height: 64 + ANDROID_MIN_NAVIGATION_INSET, paddingBottom: ANDROID_MIN_NAVIGATION_INSET })
    expect(getMainTabBarStyle('android', 42)).toMatchObject({ height: 106, paddingBottom: 42 })
    expect(getMainTabBarStyle('ios', 34)).not.toHaveProperty('height')
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
