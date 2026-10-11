import { Pressable, Text, View } from 'react-native'
import { BookingQuoteSummary } from './BookingQuoteSummary'
import { AppTextField } from '../ui/AppTextField'
import { SurfaceCard } from '../ui/SurfaceCard'
import type { PricingRates, BookingQuote } from '../../src/domain/services/bookingQuote'
import { formatPHPAmount } from '../../src/shared/utils/money'

export interface CustomItemDraft {
  id: number
  kind: 'custom_charge' | 'discount'
  description: string
  amount: string
  quantity: string
}

interface BookingPricingFieldsProps {
  rates: PricingRates
  includeSecondRoom: boolean
  rentVideokeWithOneRoom: boolean
  customItems: CustomItemDraft[]
  customErrors: Record<number, string>
  quote: BookingQuote
  quoteError: string
  onToggleSecondRoom: () => void
  onToggleVideoke: () => void
  onAddCustomItem: () => void
  onUpdateCustomItem: (id: number, patch: Partial<CustomItemDraft>) => void
  onRemoveCustomItem: (id: number) => void
}

function OptionToggle({ label, description, checked, onPress }: {
  label: string
  description: string
  checked: boolean
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} className="flex-row items-start gap-3 rounded-2xl border border-line bg-white p-4">
      <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${checked ? 'border-cenere-600 bg-cenere-600' : 'border-stone-300'}`}>
        {checked ? <Text className="text-xs font-bold text-white">✓</Text> : null}
      </View>
      <View className="flex-1 gap-1"><Text className="text-sm font-semibold text-ink">{label}</Text><Text className="text-sm leading-5 text-muted">{description}</Text></View>
    </Pressable>
  )
}

export function BookingPricingFields({
  rates, includeSecondRoom, rentVideokeWithOneRoom, customItems, customErrors, quote, quoteError,
  onToggleSecondRoom, onToggleVideoke, onAddCustomItem, onUpdateCustomItem, onRemoveCustomItem,
}: BookingPricingFieldsProps) {
  return <View className="gap-5">
    <SurfaceCard className="gap-4">
      <Text className="text-lg font-semibold text-ink">Rooms and videoke</Text>
      <OptionToggle
        label={`Add a second room (+ ${formatPHPAmount(rates.additionalRoomAmountMinor)})`}
        description="One room is included in the night-use package. Videoke is free with the second room."
        checked={includeSecondRoom}
        onPress={onToggleSecondRoom}
      />
      {includeSecondRoom ? <View className="rounded-2xl bg-cenere-50 p-4"><Text className="text-sm font-medium text-cenere-700">Videoke is included at no extra charge.</Text></View> : (
        <OptionToggle label={`Rent videoke (+ ${formatPHPAmount(rates.videokeRentalAmountMinor)})`} description="Optional when booking one room." checked={rentVideokeWithOneRoom} onPress={onToggleVideoke} />
      )}
    </SurfaceCard>

    <SurfaceCard className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-lg font-semibold text-ink">Additional charges or discounts</Text>
        <Pressable onPress={onAddCustomItem} accessibilityRole="button" accessibilityLabel="Add custom line item" className="rounded-full border border-cenere-600 px-3 py-2"><Text className="text-sm font-semibold text-cenere-700">Add item</Text></Pressable>
      </View>
      {customItems.length === 0 ? <Text className="text-sm leading-5 text-muted">Add catering, appliances, discounts, or any other agreed amount.</Text> : null}
      {customItems.map((item) => <View key={item.id} className="gap-3 rounded-2xl bg-canvas p-4">
        <View className="flex-row items-center justify-between"><Text className="text-sm font-semibold text-ink">Custom line item</Text><Pressable onPress={() => onRemoveCustomItem(item.id)} accessibilityRole="button" accessibilityLabel={`Remove custom item ${item.id}`}><Text className="px-2 py-1 text-sm font-medium text-red-700">Remove</Text></Pressable></View>
        <View className="flex-row gap-2">
          <Pressable onPress={() => onUpdateCustomItem(item.id, { kind: 'custom_charge' })} accessibilityRole="radio" accessibilityLabel={`Charge item ${item.id}`} accessibilityState={{ selected: item.kind === 'custom_charge' }} className={`flex-1 items-center rounded-xl border p-3 ${item.kind === 'custom_charge' ? 'border-cenere-600 bg-cenere-50' : 'border-line bg-white'}`}><Text className="text-sm font-medium text-ink">Charge</Text></Pressable>
          <Pressable onPress={() => onUpdateCustomItem(item.id, { kind: 'discount' })} accessibilityRole="radio" accessibilityLabel={`Discount item ${item.id}`} accessibilityState={{ selected: item.kind === 'discount' }} className={`flex-1 items-center rounded-xl border p-3 ${item.kind === 'discount' ? 'border-cenere-600 bg-cenere-50' : 'border-line bg-white'}`}><Text className="text-sm font-medium text-ink">Discount</Text></Pressable>
        </View>
        <AppTextField label="Description" value={item.description} onChangeText={(value) => onUpdateCustomItem(item.id, { description: value })} placeholder="For example, catering" />
        <View className="flex-row gap-3">
          <View className="flex-1"><AppTextField label="Amount (PHP)" value={item.amount} onChangeText={(value) => onUpdateCustomItem(item.id, { amount: value })} keyboardType="decimal-pad" /></View>
          <View className="w-24"><AppTextField label="Quantity" value={item.quantity} onChangeText={(value) => onUpdateCustomItem(item.id, { quantity: value })} keyboardType="number-pad" /></View>
        </View>
        {customErrors[item.id] ? <Text className="text-sm text-red-700" accessibilityRole="alert">{customErrors[item.id]}</Text> : null}
      </View>)}
    </SurfaceCard>
    {quoteError ? <Text className="text-sm text-red-700" accessibilityRole="alert">{quoteError}</Text> : null}
    <BookingQuoteSummary quote={quote} />
  </View>
}
