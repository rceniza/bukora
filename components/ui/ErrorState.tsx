import { Text, View } from 'react-native'
import { PrimaryButton } from './PrimaryButton'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <View className="items-center gap-3 px-6 py-10">
      <Text className="text-center text-lg font-semibold text-ink">{title}</Text>
      <Text className="text-center leading-6 text-muted" accessibilityRole="alert">{message}</Text>
      {onRetry ? <PrimaryButton label="Try again" onPress={onRetry} className="mt-2 w-full max-w-xs" /> : null}
    </View>
  )
}
