import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { Link, useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BookingQuoteSummary } from '../../components/booking/BookingQuoteSummary'
import { CalendarDateField } from '../../components/forms/CalendarDateField'
import { GuestDetailsFields } from '../../components/forms/GuestDetailsFields'
import type { GuestDetailsValues } from '../../components/forms/GuestDetailsFields'
import { AppTextField } from '../../components/ui/AppTextField'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { SurfaceCard } from '../../components/ui/SurfaceCard'
import { CreateBookingService } from '../../src/application/services/CreateBookingService'
import { useAppSettings } from '../../src/application/settings/AppSettingsContext'
import { useDashboard } from '../../src/application/dashboard/DashboardContext'
import { bookingFormSchema } from '../../src/domain/schemas/booking'
import { calculateBookingQuote } from '../../src/domain/services/bookingQuote'
import { bookingRepository } from '../../src/data/repositories/bookingRepository'
import { formatPHPAmount } from '../../src/shared/utils/money'
import { parsePHPAmountInput } from '../../src/shared/utils/moneyInput'

interface CustomItemDraft {
  id: number
  kind: 'custom_charge' | 'discount'
  description: string
  amount: string
  quantity: string
}

const todayISO = () => format(new Date(), 'yyyy-MM-dd')

function OptionToggle({
  label,
  description,
  checked,
  disabled = false,
  onPress,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      className={`flex-row items-start gap-3 rounded-2xl border border-line bg-white p-4 ${disabled ? 'opacity-60' : ''}`}
    >
      <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${checked ? 'border-cenere-600 bg-cenere-600' : 'border-stone-300'}`}>
        {checked ? <Text className="text-xs font-bold text-white">✓</Text> : null}
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-ink">{label}</Text>
        <Text className="text-sm leading-5 text-muted">{description}</Text>
      </View>
    </Pressable>
  )
}

export default function NewBookingRoute() {
  const router = useRouter()
  const { settings } = useAppSettings()
  const { refresh } = useDashboard()
  const [guest, setGuest] = useState<GuestDetailsValues>({ guestName: '', address: '', cellphone: '', email: '', pax: '' })
  const [checkInDate, setCheckInDate] = useState(todayISO)
  const [checkOutDate, setCheckOutDate] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [includeSecondRoom, setIncludeSecondRoom] = useState(false)
  const [rentVideokeWithOneRoom, setRentVideokeWithOneRoom] = useState(false)
  const [customItems, setCustomItems] = useState<CustomItemDraft[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [customErrors, setCustomErrors] = useState<Record<number, string>>({})
  const [overlaps, setOverlaps] = useState<{ id: string; guestName: string; checkInDate: string; checkOutDate: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [nextCustomId, setNextCustomId] = useState(1)

  const rates = useMemo(() => ({
    nightUseAmountMinor: settings.nightUseAmountMinor,
    additionalRoomAmountMinor: settings.additionalRoomAmountMinor,
    videokeRentalAmountMinor: settings.videokeRentalAmountMinor,
  }), [settings.additionalRoomAmountMinor, settings.nightUseAmountMinor, settings.videokeRentalAmountMinor])
  const createBookingService = useMemo(() => new CreateBookingService(bookingRepository, { rates }), [rates])

  const validCustomItems = useMemo(() => customItems.flatMap((item) => {
    const amountMinor = parsePHPAmountInput(item.amount)
    const quantity = Number(item.quantity)
    if (!item.description.trim() || amountMinor === null || !Number.isInteger(quantity) || quantity <= 0) return []
    return [{ kind: item.kind, description: item.description, quantity, amountMinor }]
  }), [customItems])
  const quoteResult = useMemo(() => {
    try {
      return { quote: calculateBookingQuote({ includeSecondRoom, rentVideokeWithOneRoom, customItems: validCustomItems }, rates), error: '' }
    } catch {
      return { quote: calculateBookingQuote({ includeSecondRoom, rentVideokeWithOneRoom }, rates), error: 'Check the discount amount; discounts cannot exceed the booking total.' }
    }
  }, [includeSecondRoom, rates, rentVideokeWithOneRoom, validCustomItems])

  function changeGuest(field: keyof GuestDetailsValues, value: string) {
    setGuest((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  function updateCustomItem(id: number, patch: Partial<CustomItemDraft>) {
    setCustomItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
    setCustomErrors((current) => ({ ...current, [id]: '' }))
  }

  function addCustomItem() {
    setCustomItems((current) => [...current, { id: nextCustomId, kind: 'custom_charge', description: '', amount: '', quantity: '1' }])
    setNextCustomId((current) => current + 1)
  }

  async function saveBooking(allowOverlap = false) {
    setErrorMessage('')
    const paxValue = guest.pax.trim() ? Number(guest.pax) : undefined
    const bookingInput = {
      guestName: guest.guestName,
      address: guest.address,
      cellphone: guest.cellphone,
      email: guest.email,
      pax: paxValue,
      checkInDate,
      checkOutDate,
      notes,
    }
    const parsedBooking = bookingFormSchema.safeParse(bookingInput)
    if (!parsedBooking.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsedBooking.error.issues) {
        const key = String(issue.path[0] ?? 'guestName')
        if (!errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    const customValidation: Record<number, string> = {}
    for (const item of customItems) {
      if (!item.description.trim() || parsePHPAmountInput(item.amount) === null
        || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
        customValidation[item.id] = 'Enter a description, valid amount, and positive quantity.'
      }
    }
    if (Object.keys(customValidation).length > 0) {
      setCustomErrors(customValidation)
      return
    }
    if (quoteResult.error) {
      setErrorMessage(quoteResult.error)
      return
    }

    const pricing = { includeSecondRoom, rentVideokeWithOneRoom, customItems: validCustomItems }
    try {
      const conflicts = await bookingRepository.findOverlaps(checkInDate, checkOutDate)
      if (conflicts.length > 0 && !allowOverlap) {
        setOverlaps(conflicts.map(({ id, guestName, checkInDate: start, checkOutDate: end }) => ({ id, guestName, checkInDate: start, checkOutDate: end })))
        return
      }

      setOverlaps([])
      setSaving(true)
      await createBookingService.create({ booking: bookingInput, pricing })
      await refresh()
      router.replace('/')
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : 'The booking could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
        <View className="flex-row items-center justify-between">
          <View className="gap-1">
            <Text className="text-3xl font-bold text-ink">Add a booking</Text>
            <Text className="text-sm text-muted">Record a new stay for {settings.propertyName}.</Text>
          </View>
          <Link href="/" className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-ink">Cancel</Link>
        </View>

        <SurfaceCard className="gap-4">
          <Text className="text-lg font-semibold text-ink">Guest details</Text>
          <GuestDetailsFields values={guest} errors={fieldErrors} onChange={changeGuest} />
          <AppTextField label="Booking notes (optional)" value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />
        </SurfaceCard>

        <SurfaceCard className="gap-4">
          <Text className="text-lg font-semibold text-ink">Stay dates</Text>
          <CalendarDateField label="Check-in" value={checkInDate} onChange={(value) => { setCheckInDate(value); setOverlaps([]) }} error={fieldErrors.checkInDate} />
          <CalendarDateField label="Check-out" value={checkOutDate} onChange={(value) => { setCheckOutDate(value); setOverlaps([]) }} error={fieldErrors.checkOutDate} />
        </SurfaceCard>

        <SurfaceCard className="gap-4">
          <Text className="text-lg font-semibold text-ink">Rooms and videoke</Text>
          <OptionToggle
            label={`Add a second room (+ ${formatPHPAmount(rates.additionalRoomAmountMinor)})`}
            description="One room is included in the night-use package. Videoke is free with the second room."
            checked={includeSecondRoom}
            onPress={() => { setIncludeSecondRoom((current) => !current); setRentVideokeWithOneRoom(false) }}
          />
          {includeSecondRoom ? (
            <View className="rounded-2xl bg-cenere-50 p-4"><Text className="text-sm font-medium text-cenere-700">Videoke is included at no extra charge.</Text></View>
          ) : (
            <OptionToggle
              label={`Rent videoke (+ ${formatPHPAmount(rates.videokeRentalAmountMinor)})`}
              description="Optional when booking one room."
              checked={rentVideokeWithOneRoom}
              onPress={() => setRentVideokeWithOneRoom((current) => !current)}
            />
          )}
        </SurfaceCard>

        <SurfaceCard className="gap-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-lg font-semibold text-ink">Additional charges or discounts</Text>
            <Pressable onPress={addCustomItem} accessibilityRole="button" accessibilityLabel="Add custom line item" className="rounded-full border border-cenere-600 px-3 py-2">
              <Text className="text-sm font-semibold text-cenere-700">Add item</Text>
            </Pressable>
          </View>
          {customItems.length === 0 ? <Text className="text-sm leading-5 text-muted">Add catering, appliances, discounts, or any other agreed amount.</Text> : null}
          {customItems.map((item) => (
            <View key={item.id} className="gap-3 rounded-2xl bg-canvas p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-ink">Custom line item</Text>
                <Pressable onPress={() => setCustomItems((current) => current.filter(({ id }) => id !== item.id))} accessibilityRole="button" accessibilityLabel={`Remove custom item ${item.id}`}>
                  <Text className="px-2 py-1 text-sm font-medium text-red-700">Remove</Text>
                </Pressable>
              </View>
              <View className="flex-row gap-2">
                <Pressable onPress={() => updateCustomItem(item.id, { kind: 'custom_charge' })} accessibilityRole="radio" accessibilityLabel={`Charge item ${item.id}`} accessibilityState={{ selected: item.kind === 'custom_charge' }} className={`flex-1 items-center rounded-xl border p-3 ${item.kind === 'custom_charge' ? 'border-cenere-600 bg-cenere-50' : 'border-line bg-white'}`}>
                  <Text className="text-sm font-medium text-ink">Charge</Text>
                </Pressable>
                <Pressable onPress={() => updateCustomItem(item.id, { kind: 'discount' })} accessibilityRole="radio" accessibilityLabel={`Discount item ${item.id}`} accessibilityState={{ selected: item.kind === 'discount' }} className={`flex-1 items-center rounded-xl border p-3 ${item.kind === 'discount' ? 'border-cenere-600 bg-cenere-50' : 'border-line bg-white'}`}>
                  <Text className="text-sm font-medium text-ink">Discount</Text>
                </Pressable>
              </View>
              <AppTextField label="Description" value={item.description} onChangeText={(value) => updateCustomItem(item.id, { description: value })} placeholder="For example, catering" />
              <View className="flex-row gap-3">
                <View className="flex-1"><AppTextField label="Amount (PHP)" value={item.amount} onChangeText={(value) => updateCustomItem(item.id, { amount: value })} keyboardType="decimal-pad" /></View>
                <View className="w-24"><AppTextField label="Quantity" value={item.quantity} onChangeText={(value) => updateCustomItem(item.id, { quantity: value })} keyboardType="number-pad" /></View>
              </View>
              {customErrors[item.id] ? <Text className="text-sm text-red-700" accessibilityRole="alert">{customErrors[item.id]}</Text> : null}
            </View>
          ))}
        </SurfaceCard>

        {quoteResult.error ? <Text className="text-sm text-red-700" accessibilityRole="alert">{quoteResult.error}</Text> : null}
        <BookingQuoteSummary quote={quoteResult.quote} />

        {overlaps.length > 0 ? (
          <SurfaceCard className="gap-3 border border-amber-300 bg-amber-50">
            <Text className="text-base font-semibold text-amber-900">These dates overlap another active booking</Text>
            {overlaps.map((booking) => <Text key={booking.id} className="text-sm leading-5 text-amber-900">{booking.guestName} · {booking.checkInDate} to {booking.checkOutDate}</Text>)}
            <Text className="text-sm leading-5 text-amber-900">Check the dates before continuing. You can still save if this overlap is intentional.</Text>
            <PrimaryButton label="Save anyway" loading={saving} onPress={() => void saveBooking(true)} />
            <Pressable onPress={() => setOverlaps([])} accessibilityRole="button" className="items-center p-2"><Text className="text-sm font-medium text-amber-900">Review dates</Text></Pressable>
          </SurfaceCard>
        ) : null}

        {errorMessage ? <Text className="text-sm text-red-700" accessibilityRole="alert">{errorMessage}</Text> : null}
        {overlaps.length === 0 ? <PrimaryButton label="Save booking" loading={saving} onPress={() => void saveBooking()} /> : null}
      </ScrollView>
    </SafeAreaView>
  )
}
