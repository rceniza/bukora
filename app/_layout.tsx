import '../global.css'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { DatabaseProvider } from '../src/data/database/DatabaseProvider'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <DatabaseProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="booking/new" />
          <Stack.Screen name="booking/[id]" />
          <Stack.Screen name="payment/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="calendar" />
          <Stack.Screen name="backup" />
        </Stack>
      </DatabaseProvider>
    </>
  )
}
