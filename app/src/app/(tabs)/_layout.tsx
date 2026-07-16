import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { MonthProvider } from '@/hooks/useMonth';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const scheme = useColorScheme();
  // Mismo fondo que las pantallas (slate-100 / slate-900). Sin esto, el
  // contenedor de escenas queda blanco y se ve un destello al animar los tabs.
  const sceneBg = scheme === 'dark' ? '#0f172a' : '#f1f5f9';

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <MonthProvider>
      <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: sceneBg },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gastos fijos',
          tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="gastos"
        options={{
          title: 'Gastos',
          tabBarIcon: ({ color }) => <TabIcon emoji="🛒" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ingresos"
        options={{
          title: 'Ingresos',
          tabBarIcon: ({ color }) => <TabIcon emoji="💰" color={color} />,
        }}
      />
      <Tabs.Screen
        name="resumen"
        options={{
          title: 'Resumen',
          tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} />,
        }}
      />
      </Tabs>
    </MonthProvider>
  );
}
