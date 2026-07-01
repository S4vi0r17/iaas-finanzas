import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/lib/auth';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#2563eb]">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/login'} />;
}
