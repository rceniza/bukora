import { Text, View } from 'react-native'

interface SectionHeadingProps {
  title: string
  actionLabel?: string
  onActionPress?: () => void
}

export function SectionHeading({ title, actionLabel, onActionPress }: SectionHeadingProps) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-lg font-semibold text-ink">{title}</Text>
      {actionLabel && onActionPress ? (
        <Text
          accessibilityRole="button"
          onPress={onActionPress}
          className="text-sm font-medium text-cenere-700"
        >
          {actionLabel}
        </Text>
      ) : null}
    </View>
  )
}
