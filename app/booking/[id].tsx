import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocalSearchParams } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CalendarDateField } from '../../components/forms/CalendarDateField'
import { GuestDetailsFields } from '../../components/forms/GuestDetailsFields'
import type { GuestDetailsValues } from '../../components/forms/GuestDetailsFields'
import { AppTextField } from '../../components/ui/AppTextField'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { SurfaceCard } from '../../components/ui/SurfaceCard'
import { BookingManagementService } from '../../src/application/services/BookingManagementService'
import { bookingRepository } from '../../src/data/repositories/bookingRepository'
import type { BookingAggregate } from '../../src/domain/ports/BookingRepository'
import type { BookingId } from '../../src/domain/models'
import { bookingFormSchema } from '../../src/domain/schemas/booking'
import { checkoutAfterChangingCheckIn, formatDisplayDate, minimumCheckoutDate } from '../../src/shared/utils/date'
import { formatPHPAmount } from '../../src/shared/utils/money'
import { isUUID } from '../../src/shared/utils/uuid'
import { BackButton } from '../../components/navigation/BackButton'
import { FormScrollView } from '../../components/forms/FormScrollView'

function describeActivityDetails(details: Record<string, unknown> | null): string {
  if (!details) return ''
  return Object.entries(details).flatMap(([key, value]) => {
    if (key === 'paymentId' || value === null || value === undefined || value === '') return []
    if (key === 'previous' && typeof value === 'object' && typeof details.next === 'object' && details.next !== null) {
      const previous = value as Record<string, unknown>
      const next = details.next as Record<string, unknown>
      const labels: Record<string, string> = { guestName: 'Guest', address: 'Address', cellphone: 'Cellphone', email: 'Email', pax: 'Pax', checkInDate: 'Check-in', checkOutDate: 'Check-out', notes: 'Notes' }
      return Object.keys(labels).flatMap((field) => {
        if (previous[field] === next[field]) return []
        const display = (item: unknown) => item === null || item === '' ? '—'
          : (field === 'checkInDate' || field === 'checkOutDate') ? formatDisplayDate(String(item)) : String(item)
        return [`${labels[field]}: ${display(previous[field])} → ${display(next[field])}`]
      })
    }
    if (key === 'next') return []
    if (key === 'amountMinor' && typeof value === 'number') return [`Amount: ${formatPHPAmount(value)}`]
    if ((key === 'checkInDate' || key === 'checkOutDate') && typeof value === 'string') return [`${key === 'checkInDate' ? 'Check-in' : 'Check-out'}: ${formatDisplayDate(value)}`]
    const label = key === 'transactionReference' ? 'Reference' : key === 'reason' ? 'Reason' : key
    return [`${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`]
  }).join(' · ')
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const bookingId = isUUID(id) ? id as BookingId : null
  const [record, setRecord] = useState<BookingAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [reason, setReason] = useState('')
  const [guest, setGuest] = useState<GuestDetailsValues>({ guestName: '', address: '', cellphone: '', email: '', pax: '' })
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [notes, setNotes] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const service = useMemo(() => new BookingManagementService(bookingRepository), [])

  const load = useCallback(async () => {
    setLoading(true)
    if (!bookingId) {
      setRecord(null)
      setError('This booking link is invalid.')
      setLoading(false)
      return
    }
    try {
      const found = await bookingRepository.findById(bookingId)
      setRecord(found)
      if (found) {
        const { booking } = found
        setGuest({ guestName: booking.guestName, address: booking.address ?? '', cellphone: booking.cellphone, email: booking.email ?? '', pax: booking.pax ? String(booking.pax) : '' })
        setCheckIn(booking.checkInDate); setCheckOut(booking.checkOutDate); setNotes(booking.notes ?? '')
      }
      setError('')
    } catch { setError('This booking could not be loaded from this device.') }
    finally { setLoading(false) }
  }, [bookingId])
  useEffect(() => { void load() }, [load])

  async function saveChanges() {
    if (!record) return
    setSaving(true); setError('')
    try {
      const input = { ...guest, pax: guest.pax ? Number(guest.pax) : null, checkInDate: checkIn, checkOutDate: checkOut, notes }
      const parsed = bookingFormSchema.safeParse(input)
      if (!parsed.success) {
        const errors: Record<string, string> = {}
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? 'guestName')
          if (!errors[key]) errors[key] = issue.message
        }
        setFieldErrors(errors)
        setSaving(false)
        return
      }
      const updated = await service.updateDetails(record.booking.id, input)
      setFieldErrors({})
      setRecord(updated); setEditing(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Changes could not be saved.') }
    finally { setSaving(false) }
  }
  async function cancelBooking() {
    if (!record) return
    setSaving(true); setError('')
    try { setRecord(await service.cancel(record.booking.id, reason)); setConfirmCancel(false) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Booking could not be cancelled.') }
    finally { setSaving(false) }
  }

  if (loading) return <SafeAreaView className="flex-1 bg-canvas p-5"><BackButton label="Bookings" fallback="/booking" /><LoadingState message="Loading booking" /></SafeAreaView>
  if (!record) return <SafeAreaView className="flex-1 bg-canvas p-5"><BackButton label="Bookings" fallback="/booking" /><ErrorState message={error || 'Booking was not found.'} onRetry={() => void load()} /></SafeAreaView>
  const { booking, lineItems, payments, activity } = record
  const total = lineItems.reduce((sum, item) => sum + item.totalAmountMinor, 0)
  const paid = payments.reduce((sum, payment) => sum + (payment.kind === 'refund' ? -payment.amountMinor : payment.amountMinor), 0)

  return <SafeAreaView className="flex-1 bg-canvas"><FormScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
    <View className="flex-row items-center justify-between"><BackButton label="Bookings" fallback="/booking" /><Text className="text-xs font-semibold uppercase text-cenere-700">{booking.status}</Text></View>
    <View><Text className="text-3xl font-bold text-ink">{booking.guestName}</Text><Text className="mt-1 text-sm text-muted">{formatDisplayDate(booking.checkInDate)} – {formatDisplayDate(booking.checkOutDate)}</Text></View>
    {error ? <ErrorState message={error} /> : null}
    {editing ? <SurfaceCard className="gap-4"><Text className="text-lg font-semibold text-ink">Edit booking</Text><GuestDetailsFields values={guest} errors={fieldErrors} onChange={(field, value) => { setGuest((current) => ({ ...current, [field]: value })); setFieldErrors((current) => ({ ...current, [field]: '' })) }} /><View className="flex-row gap-3"><CalendarDateField label="Check-in" value={checkIn} error={fieldErrors.checkInDate} onChange={(value) => { setCheckOut((current) => checkoutAfterChangingCheckIn(checkIn, current, value)); setCheckIn(value); setFieldErrors((current) => ({ ...current, checkInDate: '', checkOutDate: '' })) }} /><CalendarDateField label="Check-out" value={checkOut} minimumDate={minimumCheckoutDate(checkIn) ?? undefined} error={fieldErrors.checkOutDate} onChange={(value) => { setCheckOut(value); setFieldErrors((current) => ({ ...current, checkOutDate: '' })) }} /></View><AppTextField label="Booking notes (optional)" value={notes} onChangeText={setNotes} multiline /><PrimaryButton label={saving ? 'Saving…' : 'Save changes'} onPress={() => void saveChanges()} disabled={saving} /><Pressable onPress={() => setEditing(false)} className="items-center p-2"><Text className="font-semibold text-muted">Discard edits</Text></Pressable></SurfaceCard> : <>
      <SurfaceCard className="gap-3"><View className="flex-row justify-between"><Text className="text-sm text-muted">Cellphone</Text><Text className="text-sm font-medium text-ink">{booking.cellphone}</Text></View><View className="flex-row justify-between"><Text className="text-sm text-muted">Address</Text><Text className="max-w-[65%] text-right text-sm font-medium text-ink">{booking.address || '—'}</Text></View><View className="flex-row justify-between"><Text className="text-sm text-muted">Guests</Text><Text className="text-sm font-medium text-ink">{booking.pax} pax</Text></View>{booking.email ? <View className="flex-row justify-between"><Text className="text-sm text-muted">Email</Text><Text className="text-sm font-medium text-ink">{booking.email}</Text></View> : null}{booking.notes ? <Text className="text-sm text-muted">{booking.notes}</Text> : null}</SurfaceCard>
      <SurfaceCard className="gap-3"><Text className="text-lg font-semibold text-ink">Price and payments</Text>{lineItems.map((item) => <View key={item.id} className="flex-row justify-between"><Text className="flex-1 text-sm text-muted">{item.description}</Text><Text className="text-sm text-ink">{formatPHPAmount(item.totalAmountMinor)}</Text></View>)}<View className="border-t border-line pt-3"><View className="flex-row justify-between"><Text className="font-medium text-ink">Total</Text><Text className="font-semibold text-ink">{formatPHPAmount(total)}</Text></View><View className="mt-2 flex-row justify-between"><Text className="text-sm text-muted">Paid</Text><Text className="text-sm text-cenere-700">{formatPHPAmount(paid)}</Text></View><View className="mt-2 flex-row justify-between"><Text className="text-sm text-muted">Balance due</Text><Text className="text-sm font-semibold text-ink">{formatPHPAmount(total - paid)}</Text></View></View>{payments.length === 0 ? <Text className="text-sm text-muted">No payments recorded yet.</Text> : payments.map((payment) => <Text key={payment.id} className="text-sm text-muted">{formatDisplayDate(payment.paidAt)} · {payment.transactionReference || payment.method || payment.kind} · {payment.kind === 'refund' ? '−' : '+'}{formatPHPAmount(payment.amountMinor)}</Text>)}<Link href={{ pathname: '/payments', params: { bookingId: booking.id } }} asChild><Pressable accessibilityRole="button"><Text className="font-semibold text-cenere-700">Record a payment or refund →</Text></Pressable></Link></SurfaceCard>
      {booking.status !== 'cancelled' ? <SurfaceCard className="gap-3"><PrimaryButton label="Edit details or dates" onPress={() => setEditing(true)} />{confirmCancel ? <><AppTextField label="Cancellation reason (optional)" value={reason} onChangeText={setReason} /><PrimaryButton label={saving ? 'Cancelling…' : 'Confirm cancellation'} onPress={() => void cancelBooking()} disabled={saving} /><Pressable onPress={() => setConfirmCancel(false)} className="items-center p-2"><Text className="font-semibold text-muted">Keep booking</Text></Pressable></> : <Pressable onPress={() => setConfirmCancel(true)} accessibilityRole="button" className="items-center rounded-2xl border border-amber-300 p-3"><Text className="font-semibold text-amber-800">Cancel booking</Text></Pressable>}</SurfaceCard> : null}
    </>}
    <SurfaceCard className="gap-3"><Text className="text-lg font-semibold text-ink">Change history</Text>{activity.slice().reverse().map((item) => <View key={item.id} className="border-l-2 border-cenere-500 pl-3"><Text className="text-sm font-medium text-ink">{item.summary}</Text>{describeActivityDetails(item.details) ? <Text className="mt-1 text-xs leading-5 text-muted">{describeActivityDetails(item.details)}</Text> : null}<Text className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</Text></View>)}</SurfaceCard>
  </FormScrollView></SafeAreaView>
}
