import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, Text, View } from 'react-native'

interface NotificationBellProps {
  unreadCount: number
  onPress: () => void
}

export function NotificationBell({ unreadCount, onPress }: NotificationBellProps) {
  const badge = unreadCount > 99 ? '99+' : String(unreadCount)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      className="relative h-11 w-11 items-center justify-center rounded-full border border-line bg-white"
    >
      <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={22} color="#2d7253" />
      {unreadCount > 0 ? (
        <View className="absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-canvas bg-red-600 px-1">
          <Text className="text-[10px] font-bold text-white">{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}
