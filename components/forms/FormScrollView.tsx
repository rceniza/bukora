import { Platform, ScrollView, type ScrollViewProps } from 'react-native'

export function FormScrollView(props: ScrollViewProps) {
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      {...props}
    />
  )
}
