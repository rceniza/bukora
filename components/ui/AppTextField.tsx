import { Text, TextInput, View, type TextInputProps } from 'react-native'

export interface AppTextFieldProps extends Omit<TextInputProps, 'onChangeText'> {
  label: string
  value: string
  onChangeText: (value: string) => void
  helper?: string
  error?: string
}

export function AppTextField({
  label,
  value,
  onChangeText,
  helper,
  error,
  className,
  ...inputProps
}: AppTextFieldProps) {
  const multiline = Boolean(inputProps.multiline)

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink">{label}</Text>
      <TextInput
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
        textAlignVertical={inputProps.textAlignVertical ?? (multiline ? 'top' : 'center')}
        className={`${multiline ? 'min-h-28' : 'min-h-12'} rounded-xl border bg-white px-4 py-3 text-base text-ink ${error ? 'border-red-500' : 'border-stone-200'} ${className ?? ''}`}
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        accessibilityState={{ disabled: inputProps.editable === false }}
        accessibilityHint={inputProps.accessibilityHint ?? error ?? helper}
      />
      {error ? (
        <Text className="text-sm text-red-700" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text className="text-sm text-muted">
          {helper}
        </Text>
      ) : null}
    </View>
  )
}
