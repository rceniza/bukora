import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter, type Href } from 'expo-router'
import { Pressable, Text } from 'react-native'

interface BackButtonProps {
  label: string
  fallback: Href
}

export function BackButton({ label, fallback }: BackButtonProps) {
  const router = useRouter()

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace(fallback)
  }

  return (
    <Pressable
      onPress={goBack}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-h-11 flex-row items-center self-start gap-1 rounded-full pr-3"
    >
      <Ionicons name="chevron-back" size={20} color="#2d7253" />
      <Text className="font-semibold text-cenere-700">{label}</Text>
    </Pressable>
  )
}
