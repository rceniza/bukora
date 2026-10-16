import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context'
import { Platform } from 'react-native'
import { getAppSafeAreaEdges } from './androidSafeArea'

/** Android's bottom inset is reserved once by the app root; iOS screens keep their own safe area. */
export function AppSafeAreaView(props: SafeAreaViewProps) {
  return (
    <SafeAreaView
      {...props}
      edges={getAppSafeAreaEdges(Platform.OS)}
    />
  )
}
