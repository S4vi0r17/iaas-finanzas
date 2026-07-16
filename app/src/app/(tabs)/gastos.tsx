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
  const [editing, setEditing] = useState<Expense | null>(null);

  const baseCurrency = user?.currency ?? 'PEN';
  // Solo gastos variables. Los pagos de obligación se gestionan desde su pestaña.
  const expenses = (data?.expenses ?? []).filter((expense) => expense.tipo === 'variable');

  function paymentMethodLabel(id: string | null) {
    const paymentMethod = pmData?.paymentMethods.find((method) => method.id === id);
    return paymentMethod ? `${PM_ICONS[paymentMethod.type]} ${paymentMethod.name}` : '';
  }

  const metrics = useMemo<Metric[]>(() => {
    const baseExpenses = expenses.filter((expense) => expense.moneda === baseCurrency);
    const total = baseExpenses.reduce((sum, expense) => sum + expense.monto, 0);
    const dayCount = new Set(baseExpenses.map((expense) => expense.fecha)).size;
    return [
      { value: fmtShort(total, baseCurrency), label: `Total ${baseCurrency}`, color: '#ea580c' },
      { value: String(expenses.length), label: 'Registros' },
      { value: dayCount > 0 ? fmtShort(total / dayCount, baseCurrency) : '-', label: 'Prom/día' },
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
                onPress={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
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
          <ItemRow
            item={item}
            pmLabel={paymentMethodLabel(item.paymentMethodId)}
            onEdit={() => {
              setEditing(item);
              setFormOpen(true);
            }}
            onDelete={() => confirmDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator className="mt-10" color="#ea580c" />
          ) : (
            <Text className="mt-10 text-center text-slate-400">Sin gastos este mes</Text>
          )
        }
      />

      <ExpenseForm visible={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </SafeAreaView>
  );
}

function ItemRow({
  item,
  pmLabel,
  onEdit,
  onDelete,
}: {
  item: Expense;
  pmLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = item.cat;
  return (
    <View
      className="mx-4 mb-1.5 flex-row items-center gap-3 rounded-xl bg-white p-3 dark:bg-slate-800"
      style={{ borderLeftWidth: 3, borderLeftColor: '#ea580c' }}
    >
      <Pressable onPress={onEdit} className="flex-1">
        <Text className="font-semibold text-slate-800 dark:text-slate-100" numberOfLines={1}>
          {item.descripcion}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {cat} · {item.fecha}
          {pmLabel ? `  ${pmLabel}` : ''}
        </Text>
      </Pressable>
      <Text className="font-bold text-slate-800 dark:text-slate-100">{fmt(item.monto, item.moneda)}</Text>
      <Pressable onPress={onEdit} className="px-1">
        <Text className="text-slate-400">✎</Text>
      </Pressable>
      <Pressable onPress={onDelete} className="px-1">
        <Text className="text-slate-400">✕</Text>
      </Pressable>
    </View>
  );
}
