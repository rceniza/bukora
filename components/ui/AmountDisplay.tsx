import { Text, View } from 'react-native'
import { formatPHPAmount } from '../../src/shared/utils/money'

interface AmountDisplayProps {
  amountMinor: number
  label?: string
  emphasis?: 'normal' | 'strong'
  amountClassName?: string
}

export function AmountDisplay({ amountMinor, label, emphasis = 'normal', amountClassName = '' }: AmountDisplayProps) {
  return (
    <View className="gap-1">
      {label ? <Text className="text-sm text-muted">{label}</Text> : null}
      <Text className={`text-base text-ink ${emphasis === 'strong' ? 'text-xl font-bold' : 'font-medium'} ${amountClassName}`}>
        {formatPHPAmount(amountMinor)}
      </Text>
    </View>
  )
}
