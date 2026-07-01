import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResumenScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      <View className="bg-[#2563eb] px-4 py-3">
        <Text className="text-lg font-bold text-white">Resumen</Text>
      </View>
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-base text-slate-500 dark:text-slate-400">Próximamente 📊</Text>
      </View>
    </SafeAreaView>
  );
}
