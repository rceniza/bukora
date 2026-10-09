import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getCountryCallingCode } from 'libphonenumber-js'
import {
  getPhoneCountryFlag,
  PHONE_COUNTRIES,
  type PhoneCountryCode,
} from '../../src/shared/utils/phone'

interface PhoneNumberFieldProps {
  value: string
  countryCode: PhoneCountryCode
  onChangeText: (value: string) => void
  onCountryCodeChange: (value: PhoneCountryCode) => void
  error?: string
}

export function PhoneNumberField({ value, countryCode, onChangeText, onCountryCodeChange, error }: PhoneNumberFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false)
  const [query, setQuery] = useState('')
  const selectedCountry = PHONE_COUNTRIES.find((country) => country.countryCode === countryCode)
  const callingCode = getCountryCallingCode(countryCode)
  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return PHONE_COUNTRIES
    return PHONE_COUNTRIES.filter(({ countryCode: code, name, callingCode: dialCode }) =>
      name.toLocaleLowerCase().includes(normalizedQuery)
      || code.toLocaleLowerCase().includes(normalizedQuery)
      || `+${dialCode}`.includes(normalizedQuery),
    )
  }, [query])

  function closePicker() {
    setPickerVisible(false)
    setQuery('')
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink">Cellphone number</Text>
      <View className={`min-h-12 flex-row items-stretch overflow-hidden rounded-xl border bg-white ${error ? 'border-red-500' : 'border-stone-200'}`}>
        <Pressable
          onPress={() => setPickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Choose country calling code${selectedCountry ? `, ${selectedCountry.name} (+${callingCode})` : `, +${callingCode}`}`}
          className="min-h-12 flex-row items-center gap-1 px-3"
        >
          <Text className="text-base text-ink">{getPhoneCountryFlag(countryCode)}</Text>
          <Text className="text-sm font-semibold text-ink">(+{callingCode})</Text>
          <Text className="text-xs text-muted">⌄</Text>
        </Pressable>
        <View className="my-2 w-px bg-stone-200" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          autoComplete="tel-national"
          textContentType="telephoneNumber"
          className="min-h-12 min-w-0 flex-1 px-3 py-3 text-base text-ink"
          placeholder="Phone number"
          placeholderTextColor="#8b928e"
          accessibilityLabel="Cellphone number"
          accessibilityHint={error}
        />
      </View>
      {error ? <Text className="text-sm text-red-700" accessibilityRole="alert">{error}</Text> : null}

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={closePicker}>
        <SafeAreaView className="flex-1 justify-end bg-black/40">
          <View className="h-[88%] overflow-hidden rounded-t-3xl bg-white px-5 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-ink">Choose country code</Text>
              <Pressable onPress={closePicker} accessibilityRole="button" accessibilityLabel="Close country list" className="px-2 py-1">
                <Text className="font-semibold text-cenere-700">Done</Text>
              </Pressable>
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or calling code"
              placeholderTextColor="#8b928e"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Search country codes"
              className="mb-3 min-h-12 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-ink"
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(country) => country.countryCode}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              ListEmptyComponent={<Text className="py-8 text-center text-muted">No matching countries.</Text>}
              renderItem={({ item }) => {
                const selected = item.countryCode === countryCode
                return (
                  <Pressable
                    onPress={() => { onCountryCodeChange(item.countryCode); closePicker() }}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name} (+${item.callingCode})`}
                    accessibilityState={{ selected }}
                    className={`min-h-12 flex-row items-center justify-between border-b border-line py-3 ${selected ? 'bg-cenere-50' : ''}`}
                  >
                    <View className="flex-1 flex-row items-center gap-3 pr-3">
                      <Text className="text-lg">{getPhoneCountryFlag(item.countryCode)}</Text>
                      <Text className="flex-1 text-base text-ink">{item.name}</Text>
                    </View>
                    <Text className="text-sm font-semibold text-cenere-700">(+{item.callingCode})</Text>
                  </Pressable>
                )
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  )
}
