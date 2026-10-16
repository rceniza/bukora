import { Text } from 'react-native'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import MainTabsLayout, { ANDROID_MIN_NAVIGATION_INSET, getMainTabBarInsets, mainTabBarStyle } from '../app/(tabs)/_layout'

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))

const destination = (label: string) => () => <Text>{label} section</Text>

describe('main tab navigation', () => {
  it('passes the measured Android system inset to the tab navigator', () => {
    expect(mainTabBarStyle).not.toHaveProperty('paddingBottom')
    expect(mainTabBarStyle).not.toHaveProperty('height')
    expect(getMainTabBarInsets('android', 0)).toEqual({ bottom: ANDROID_MIN_NAVIGATION_INSET })
    expect(getMainTabBarInsets('android', 42)).toEqual({ bottom: 42 })
    expect(getMainTabBarInsets('ios', 34)).toEqual({ bottom: 34 })
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
