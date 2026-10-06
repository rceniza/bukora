import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native'

interface PrimaryButtonProps extends Omit<PressableProps, 'children'> {
  label: string
  loading?: boolean
}

export function PrimaryButton({ label, loading = false, disabled, className, ...props }: PrimaryButtonProps) {
  const isDisabled = disabled || loading

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      className={`min-h-12 flex-row items-center justify-center rounded-xl bg-cenere-600 px-5 py-3 active:bg-cenere-700 disabled:opacity-50 ${className ?? ''}`}
    >
      {loading ? <ActivityIndicator color="#ffffff" testID="loading-indicator" /> : <Text className="text-base font-semibold text-white">{label}</Text>}
    </Pressable>
  )
}
