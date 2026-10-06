import { ActivityIndicator, Text, View } from 'react-native'

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View className="items-center justify-center gap-3 px-6 py-10" accessibilityRole="progressbar">
      <ActivityIndicator accessibilityLabel={message} />
      <Text className="text-sm text-muted">{message}</Text>
    </View>
  )
}
