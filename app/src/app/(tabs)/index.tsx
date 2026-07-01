import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';

export default function ObligacionesScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      <View className="bg-[#2563eb] px-4 py-3">
        <Text className="text-xs text-white/80">Hola{user?.name ? `, ${user.name}` : ''}</Text>
        <Text className="text-lg font-bold text-white">Obligaciones</Text>
      </View>

      <View className="flex-1 items-center justify-center gap-3 p-6">
        <Text className="text-base text-slate-500 dark:text-slate-400">
          Aquí irán tus obligaciones 📋
        </Text>
        <Pressable
          onPress={logout}
          className="rounded-xl bg-red-600 px-5 py-2.5 active:opacity-80"
        >
          <Text className="font-semibold text-white">Cerrar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
