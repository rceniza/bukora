import { Text, View } from 'react-native'
import type { BookingQuote } from '../../src/domain/services/bookingQuote'
import { AmountDisplay } from '../ui/AmountDisplay'
import { SurfaceCard } from '../ui/SurfaceCard'
import { formatPHPAmount } from '../../src/shared/utils/money'

export function BookingQuoteSummary({ quote }: { quote: BookingQuote }) {
  return (
    <SurfaceCard className="gap-4">
      <Text className="text-lg font-semibold text-ink">Price breakdown</Text>
      <View className="gap-3">
        {quote.lineItems.map((item, index) => (
          <View className="flex-row items-start justify-between gap-4" key={`${item.kind}-${item.description}-${index}`}>
            <View className="flex-1 gap-1">
              <Text className="text-sm font-medium text-ink">{item.description}</Text>
              {item.quantity > 1 ? (
                <Text className="text-xs text-muted">{item.quantity} × {formatPHPAmount(item.unitAmountMinor)}</Text>
              ) : null}
            </View>
            <Text className="text-sm font-medium text-ink">{formatPHPAmount(item.totalAmountMinor)}</Text>
          </View>
        ))}
      </View>
      <View className="border-t border-line pt-3">
        <AmountDisplay label="Total" amountMinor={quote.totalAmountMinor} emphasis="strong" />
      </View>
    </SurfaceCard>
  )
}
