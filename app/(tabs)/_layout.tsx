import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const activeColor = '#378e64'
const inactiveColor = '#7b837e'
export const mainTabBarStyle = {
  backgroundColor: '#ffffff',
  borderTopColor: '#e7ebe8',
  paddingTop: 6,
}
export const ANDROID_MIN_NAVIGATION_INSET = 24

export function getMainTabBarInsets(platform: string, safeAreaBottom: number) {
  return {
    bottom: platform === 'android'
      ? Math.max(safeAreaBottom, ANDROID_MIN_NAVIGATION_INSET)
      : safeAreaBottom,
  }
}

export default function MainTabsLayout() {
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      safeAreaInsets={getMainTabBarInsets(Platform.OS, insets.bottom)}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: mainTabBarStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
