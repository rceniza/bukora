import { Text, View } from 'react-native'
import { SurfaceCard } from '../ui/SurfaceCard'
import { PrimaryButton } from '../ui/PrimaryButton'
import type { BookingPayment } from '../../src/domain/models'
import { formatDisplayDate } from '../../src/shared/utils/date'
import { formatPHPAmount } from '../../src/shared/utils/money'

export function BookingPaymentHistory({ payments, onAddPayment }: { payments: BookingPayment[]; onAddPayment: () => void }) {
  const orderedPayments = payments.slice().sort((left, right) => right.paidAt.localeCompare(left.paidAt) || right.createdAt.localeCompare(left.createdAt))
  return <SurfaceCard className="gap-3">
    <View className="flex-row items-center justify-between gap-3"><Text className="flex-1 text-lg font-semibold text-ink">Payment history</Text><Text className="text-xs text-muted">{payments.length} {payments.length === 1 ? 'entry' : 'entries'}</Text></View>
    {orderedPayments.length === 0 ? <Text className="text-sm text-muted">No payments or refunds recorded yet.</Text> : orderedPayments.map((payment) => <View key={payment.id} className="flex-row items-center justify-between gap-3 border-b border-line py-3">
      <View className="flex-1 gap-1"><Text className="text-sm font-semibold capitalize text-ink">{payment.kind} · {formatDisplayDate(payment.paidAt)}</Text><Text className="text-xs text-muted">{payment.method}{payment.transactionReference ? ` · Ref ${payment.transactionReference}` : ''}</Text>{payment.notes ? <Text className="text-xs text-muted">{payment.notes}</Text> : null}</View>
      <Text className={`text-sm font-semibold ${payment.kind === 'refund' ? 'text-amber-700' : 'text-cenere-700'}`}>{payment.kind === 'refund' ? '−' : '+'}{formatPHPAmount(payment.amountMinor)}</Text>
    </View>)}
    <PrimaryButton label="Add payment or refund" onPress={onAddPayment} />
  </SurfaceCard>
}
