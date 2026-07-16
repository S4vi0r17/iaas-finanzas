import type { Income } from '@iaas/shared';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IncomeForm } from '@/components/IncomeForm';
import { AppHeader } from '@/components/ui/AppHeader';
import { Metrics, type Metric } from '@/components/ui/Metrics';
import { useDeleteIncome, useIncomes } from '@/hooks/queries';
import { useMonth } from '@/hooks/useMonth';
import { useAuth } from '@/lib/auth';
import { fmt, fmtShort } from '@/lib/format';

export default function IngresosScreen() {
  const { user } = useAuth();
  const { monthKey } = useMonth();
  const { data, isLoading } = useIncomes(monthKey);
  const del = useDeleteIncome();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);

  const baseCurrency = user?.currency ?? 'PEN';
  const incomes = data?.incomes ?? [];

  const metrics = useMemo<Metric[]>(() => {
    const tot = incomes
      .filter((i) => i.moneda === baseCurrency)
      .reduce((s, i) => s + i.monto, 0);
    return [
      { value: fmtShort(tot, baseCurrency), label: `Total ${baseCurrency}`, color: '#16a34a' },
      { value: String(incomes.length), label: 'Fuentes' },
    ];
  }, [incomes, baseCurrency]);

  function confirmDelete(id: string) {
    Alert.alert('Eliminar', '¿Eliminar este ingreso?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => del.mutate(id) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      <AppHeader title="Ingresos" />

      <FlatList
        data={incomes}
        keyExtractor={(i) => i.id}
        contentContainerClassName="pb-6"
        ListHeaderComponent={
          <View>
            <Metrics items={metrics} />
            <View className="px-4 pb-2">
              <Pressable
                onPress={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="items-center rounded-xl bg-[#16a34a] py-3 active:opacity-80"
              >
                <Text className="font-semibold text-white">+ Registrar ingreso</Text>
              </Pressable>
            </View>
            <Text className="px-4 pb-1 pt-2 text-xs font-bold uppercase text-slate-400">
              Ingresos del mes
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            onEdit={() => {
              setEditing(item);
              setFormOpen(true);
            }}
            onDelete={() => confirmDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator className="mt-10" color="#16a34a" />
          ) : (
            <Text className="mt-10 text-center text-slate-400">Sin ingresos este mes</Text>
          )
        }
      />

      <IncomeForm visible={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </SafeAreaView>
  );
}

function ItemRow({ item, onEdit, onDelete }: { item: Income; onEdit: () => void; onDelete: () => void }) {
  const cat = item.cat;
  return (
    <View
      className="mx-4 mb-1.5 flex-row items-center gap-3 rounded-xl bg-white p-3 dark:bg-slate-800"
      style={{ borderLeftWidth: 3, borderLeftColor: '#16a34a' }}
    >
      <Pressable onPress={onEdit} className="flex-1">
        <Text className="font-semibold text-slate-800 dark:text-slate-100" numberOfLines={1}>
          {item.descripcion}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {cat} · {item.fecha}
        </Text>
      </Pressable>
      <Text className="font-bold text-[#16a34a]">+{fmt(item.monto, item.moneda)}</Text>
      <Pressable onPress={onEdit} className="px-1">
        <Text className="text-slate-400">✎</Text>
      </Pressable>
      <Pressable onPress={onDelete} className="px-1">
        <Text className="text-slate-400">✕</Text>
      </Pressable>
    </View>
  );
}
