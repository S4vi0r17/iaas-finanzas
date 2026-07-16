import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';

export default function RootLayout() {
  const scheme = useColorScheme();
  // Fondo base del tema (slate-100 / slate-900): evita destellos blancos
  // detrás de las pantallas durante montaje y navegación.
  const bg = scheme === 'dark' ? '#0f172a' : '#f1f5f9';

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
