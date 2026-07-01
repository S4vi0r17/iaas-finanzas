import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useAuth } from '@/lib/auth';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Obligaciones',
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
  );
}
