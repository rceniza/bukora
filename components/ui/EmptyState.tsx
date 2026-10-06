import { Text, View } from 'react-native'
import { PrimaryButton } from './PrimaryButton'

interface EmptyStateProps {
  title: string
  message: string
  actionLabel?: string
  onActionPress?: () => void
}

export function EmptyState({ title, message, actionLabel, onActionPress }: EmptyStateProps) {
  return (
    <View className="items-center gap-3 px-6 py-10">
      <Text className="text-center text-lg font-semibold text-ink">{title}</Text>
      <Text className="max-w-sm text-center leading-6 text-muted">{message}</Text>
      {actionLabel && onActionPress ? <PrimaryButton label={actionLabel} onPress={onActionPress} className="mt-2 w-full max-w-xs" /> : null}
    </View>
  )
}
