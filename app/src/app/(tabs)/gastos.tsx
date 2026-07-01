import { PM_ICONS, type Expense } from '@iaas/shared';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpenseForm } from '@/components/ExpenseForm';
import { AppHeader } from '@/components/ui/AppHeader';
import { Metrics, type Metric } from '@/components/ui/Metrics';
import { useDeleteExpense, useExpenses, usePaymentMethods } from '@/hooks/queries';
import { useMonth } from '@/hooks/useMonth';
import { useAuth } from '@/lib/auth';
import { fmt, fmtShort } from '@/lib/format';

export default function GastosScreen() {
  const { user } = useAuth();
  const { monthKey } = useMonth();
  const { data, isLoading } = useExpenses(monthKey);
  const { data: pmData } = usePaymentMethods();
  const del = useDeleteExpense();
  const [formOpen, setFormOpen] = useState(false);

  const baseCurrency = user?.currency ?? 'PEN';
  const expenses = data?.expenses ?? [];

  function pmLabel(slot: string) {
    const pm = pmData?.paymentMethods.find((p) => p.slot === slot);
    return pm ? `${PM_ICONS[pm.type]} ${pm.name}` : '';
  }

  const metrics = useMemo<Metric[]>(() => {
    const base = expenses.filter((g) => g.moneda === baseCurrency);
    const tot = base.reduce((s, g) => s + g.monto, 0);
    const days = new Set(base.map((g) => g.fecha)).size;
    return [
      { value: fmtShort(tot, baseCurrency), label: `Total ${baseCurrency}`, color: '#ea580c' },
      { value: String(expenses.length), label: 'Registros' },
      { value: days > 0 ? fmtShort(tot / days, baseCurrency) : '-', label: 'Prom/día' },
    ];
  }, [expenses, baseCurrency]);

  function confirmDelete(id: string) {
    Alert.alert('Eliminar', '¿Eliminar este gasto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => del.mutate(id) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      <AppHeader title="Gastos" />

      <FlatList
        data={expenses}
        keyExtractor={(g) => g.id}
        contentContainerClassName="pb-6"
        ListHeaderComponent={
          <View>
            <Metrics items={metrics} />
            <View className="px-4 pb-2">
              <Pressable
                onPress={() => setFormOpen(true)}
                className="items-center rounded-xl bg-[#ea580c] py-3 active:opacity-80"
              >
                <Text className="font-semibold text-white">+ Registrar gasto</Text>
              </Pressable>
            </View>
            <Text className="px-4 pb-1 pt-2 text-xs font-bold uppercase text-slate-400">
              Gastos del mes
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ItemRow item={item} pmLabel={pmLabel(item.fuente)} onDelete={() => confirmDelete(item.id)} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator className="mt-10" color="#ea580c" />
          ) : (
            <Text className="mt-10 text-center text-slate-400">Sin gastos este mes</Text>
          )
        }
      />

      <ExpenseForm visible={formOpen} onClose={() => setFormOpen(false)} />
    </SafeAreaView>
  );
}

function ItemRow({
  item,
  pmLabel,
  onDelete,
}: {
  item: Expense;
  pmLabel: string;
  onDelete: () => void;
}) {
  const cat = item.catCustom?.trim() ? item.catCustom.trim() : item.cat;
  return (
    <View
      className="mx-4 mb-1.5 flex-row items-center gap-3 rounded-xl bg-white p-3 dark:bg-slate-800"
      style={{ borderLeftWidth: 3, borderLeftColor: '#ea580c' }}
    >
      <View className="flex-1">
        <Text className="font-semibold text-slate-800 dark:text-slate-100" numberOfLines={1}>
          {item.descripcion}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {cat} · {item.fecha}
          {pmLabel ? `  ${pmLabel}` : ''}
        </Text>
      </View>
      <Text className="font-bold text-slate-800 dark:text-slate-100">{fmt(item.monto, item.moneda)}</Text>
      <Pressable onPress={onDelete} className="px-1">
        <Text className="text-slate-400">✕</Text>
      </Pressable>
    </View>
  );
}
