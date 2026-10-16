import '../global.css'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Platform, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { DatabaseProvider } from '../src/data/database/DatabaseProvider'
import { getRootContentBottomPadding } from '../src/components/layout/androidSafeArea'

function RootContentFrame() {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, paddingBottom: getRootContentBottomPadding(Platform.OS, insets.bottom), backgroundColor: '#F9FAF7' }}>
      <StatusBar style="dark" />
      <DatabaseProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="booking/new" />
          <Stack.Screen name="booking/[id]" />
          <Stack.Screen name="payment/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="calendar" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="backup" />
        </Stack>
      </DatabaseProvider>
    </View>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootContentFrame />
    </SafeAreaProvider>
  )
}
