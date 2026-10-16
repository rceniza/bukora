import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { AppSafeAreaView as SafeAreaView } from '../../src/components/layout/AppSafeAreaView'
import { BookingPricingFields, type CustomItemDraft } from '../../components/booking/BookingPricingFields'
import { StayDurationSummary } from '../../components/booking/StayDurationSummary'
import { CalendarDateField } from '../../components/forms/CalendarDateField'
import { GuestDetailsFields } from '../../components/forms/GuestDetailsFields'
import type { GuestDetailsValues } from '../../components/forms/GuestDetailsFields'
import { AppTextField } from '../../components/ui/AppTextField'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { SurfaceCard } from '../../components/ui/SurfaceCard'
import { CreateBookingService } from '../../src/application/services/CreateBookingService'
import { useAppSettings } from '../../src/application/settings/AppSettingsContext'
import { useBookingReminders } from '../../src/application/settings/BookingReminderProvider'
import { useGoogleDriveBackup } from '../../src/application/settings/GoogleDriveBackupProvider'
import { useDashboard } from '../../src/application/dashboard/DashboardContext'
import { bookingFormSchema } from '../../src/domain/schemas/booking'
import { calculateBookingQuote } from '../../src/domain/services/bookingQuote'
import { bookingRepository } from '../../src/data/repositories/bookingRepository'
import { parsePHPAmountInput } from '../../src/shared/utils/moneyInput'
import { checkoutAfterChangingCheckIn, isValidISODate, minimumCheckoutDate, parseISODate } from '../../src/shared/utils/date'
import { normalizePhoneNumber, type PhoneCountryCode } from '../../src/shared/utils/phone'
import { BackButton } from '../../components/navigation/BackButton'
import { FormScrollView } from '../../components/forms/FormScrollView'

const todayISO = () => format(new Date(), 'yyyy-MM-dd')

export default function NewBookingRoute() {
  const router = useRouter()
  const { checkInDate: routeCheckInDate } = useLocalSearchParams<{ checkInDate?: string }>()
  const initialCheckInDate = typeof routeCheckInDate === 'string' && isValidISODate(routeCheckInDate) ? routeCheckInDate : todayISO()
  const { settings } = useAppSettings()
  const { refresh } = useDashboard()
  const { refresh: refreshReminders } = useBookingReminders()
  const { queueBackup } = useGoogleDriveBackup()
  const [guest, setGuest] = useState<GuestDetailsValues>({ guestName: '', address: '', cellphone: '', email: '', pax: '' })
  const [phoneCountryCode, setPhoneCountryCode] = useState<PhoneCountryCode>('PH')
  const [checkInDate, setCheckInDate] = useState(initialCheckInDate)
  const [checkOutDate, setCheckOutDate] = useState(() => format(addDays(parseISODate(initialCheckInDate) ?? new Date(), 1), 'yyyy-MM-dd'))
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
    confirmationDepositAmountMinor: settings.confirmationDepositAmountMinor,
  }), [settings.additionalRoomAmountMinor, settings.confirmationDepositAmountMinor, settings.nightUseAmountMinor, settings.videokeRentalAmountMinor])
  const createBookingService = useMemo(() => new CreateBookingService(bookingRepository, { rates, confirmationDepositAmountMinor: rates.confirmationDepositAmountMinor }), [rates])

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

  function changeCheckInDate(value: string) {
    setCheckOutDate((currentCheckOut) => checkoutAfterChangingCheckIn(checkInDate, currentCheckOut, value))
    setCheckInDate(value)
    setOverlaps([])
    setFieldErrors((current) => ({ ...current, checkInDate: '', checkOutDate: '' }))
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
      cellphone: normalizePhoneNumber(guest.cellphone, phoneCountryCode),
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
      setSaving(true)
      const conflicts = await bookingRepository.findOverlaps(checkInDate, checkOutDate)
      if (conflicts.length > 0 && !allowOverlap) {
        setOverlaps(conflicts.map(({ id, guestName, checkInDate: start, checkOutDate: end }) => ({ id, guestName, checkInDate: start, checkOutDate: end })))
        return
      }

      setOverlaps([])
      await createBookingService.create({ booking: bookingInput, pricing })
      queueBackup()
      await refreshReminders()
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
      <FormScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6">
        <View className="flex-row items-center justify-between">
          <View className="gap-1">
            <Text className="text-3xl font-bold text-ink">Add a booking</Text>
            <Text className="text-sm text-muted">Record a new stay for {settings.propertyName}.</Text>
          </View>
          <BackButton label="Cancel" fallback="/booking" />
        </View>

        <SurfaceCard className="gap-4">
          <Text className="text-lg font-semibold text-ink">Guest details</Text>
          <GuestDetailsFields values={guest} errors={fieldErrors} onChange={changeGuest} phoneCountryCode={phoneCountryCode} onPhoneCountryCodeChange={setPhoneCountryCode} />
          <AppTextField label="Booking notes (optional)" value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />
        </SurfaceCard>

        <SurfaceCard className="gap-4">
          <Text className="text-lg font-semibold text-ink">Stay dates</Text>
          <CalendarDateField label="Check-in" value={checkInDate} onChange={changeCheckInDate} error={fieldErrors.checkInDate} />
          <CalendarDateField label="Check-out" value={checkOutDate} minimumDate={minimumCheckoutDate(checkInDate) ?? undefined} onChange={(value) => { setCheckOutDate(value); setOverlaps([]); setFieldErrors((current) => ({ ...current, checkOutDate: '' })) }} error={fieldErrors.checkOutDate} />
          <StayDurationSummary checkInDate={checkInDate} checkOutDate={checkOutDate} />
        </SurfaceCard>

        <BookingPricingFields
          rates={rates}
          includeSecondRoom={includeSecondRoom}
          rentVideokeWithOneRoom={rentVideokeWithOneRoom}
          customItems={customItems}
          customErrors={customErrors}
          quote={quoteResult.quote}
          quoteError={quoteResult.error}
          onToggleSecondRoom={() => { setIncludeSecondRoom((current) => !current); setRentVideokeWithOneRoom(false) }}
          onToggleVideoke={() => setRentVideokeWithOneRoom((current) => !current)}
          onAddCustomItem={addCustomItem}
          onUpdateCustomItem={updateCustomItem}
          onRemoveCustomItem={(id) => setCustomItems((current) => current.filter((item) => item.id !== id))}
        />

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
      </FormScrollView>
    </SafeAreaView>
  )
}
