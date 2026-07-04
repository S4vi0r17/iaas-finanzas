import {
  MAX_FREE_OBLIGATIONS,
  OBLIGATION_CATEGORY_ICONS,
  PM_ICONS,
  type Obligation,
} from '@iaas/shared';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ObligationForm } from '@/components/ObligationForm';
import { ObligationPaySheet } from '@/components/ObligationPaySheet';
import { AppHeader } from '@/components/ui/AppHeader';
import { Metrics, type Metric } from '@/components/ui/Metrics';
import { useDeleteObligation, useObligations, usePaymentMethods } from '@/hooks/queries';
import { useMonth } from '@/hooks/useMonth';
import { useAuth } from '@/lib/auth';
import { fmt, fmtShort } from '@/lib/format';
import { computeStatus } from '@/lib/obligationStatus';

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Parcial', label: 'Parcial' },
  { value: 'Retrasado', label: 'Retrasado' },
  { value: 'Pagado', label: 'Pagado' },
];

export default function ObligacionesScreen() {
  const { user } = useAuth();
  const { monthKey, year, month } = useMonth();
  const { data, isLoading } = useObligations(monthKey);
  const { data: pmData } = usePaymentMethods();
  const deleteObl = useDeleteObligation();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Obligation | null>(null);
  const [paying, setPaying] = useState<Obligation | null>(null);

  const baseCurrency = user?.currency ?? 'PEN';
  const obligations = data?.obligations ?? [];
  const paidByObligation = data?.paidByObligation ?? {};
  const paidFor = (id: string) => paidByObligation[id] ?? 0;

  function paymentMethodLabel(id: string | null) {
    const paymentMethod = pmData?.paymentMethods.find((method) => method.id === id);
    return paymentMethod ? `${PM_ICONS[paymentMethod.type]} ${paymentMethod.name}` : '';
  }

  const metrics = useMemo<Metric[]>(() => {
    let total = 0;
    let paidCount = 0;
    let partialCount = 0;
    let overdueCount = 0;
    for (const obligation of obligations) {
      if (obligation.moneda === baseCurrency) total += obligation.monto;
      const status = computeStatus(obligation, paidFor(obligation.id), year, month).label;
      if (status === 'Pagado') paidCount++;
      else if (status === 'Parcial') partialCount++;
      else if (status === 'Retrasado') overdueCount++;
    }
    return [
      { value: fmtShort(total, baseCurrency), label: `Total ${baseCurrency}` },
      {
        value: String(obligations.length),
        label: user?.isPro ? 'Total' : `Total/${MAX_FREE_OBLIGATIONS}`,
      },
      { value: String(paidCount), label: 'Pagadas', color: '#16a34a' },
      { value: String(partialCount), label: 'Parciales', color: partialCount ? '#ca8a04' : undefined },
      { value: String(overdueCount), label: 'Retrasadas', color: overdueCount ? '#dc2626' : undefined },
    ];
  }, [obligations, paidByObligation, baseCurrency, year, month, user?.isPro]);

  const list = useMemo(() => {
    const query = search.toLowerCase();
    return obligations.filter((obligation) => {
      const status = computeStatus(obligation, paidFor(obligation.id), year, month).label;
      const matchFilter =
        !filter ||
        status === filter ||
        (filter === 'Pendiente' && (status === 'Proximo' || status === 'Vence hoy'));
      const matchSearch = !query || obligation.nombre.toLowerCase().includes(query);
      return matchFilter && matchSearch;
    });
  }, [obligations, paidByObligation, search, filter, year, month]);

  function confirmDelete(id: string) {
    Alert.alert('Eliminar', '¿Eliminar esta obligación?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteObl.mutate(id) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      <AppHeader title="Obligaciones" />

      <FlatList
        data={list}
        keyExtractor={(o) => o.id}
        contentContainerClassName="pb-6"
        ListHeaderComponent={
          <View>
            <Metrics items={metrics} />

            {/* Toolbar */}
            <View className="flex-row gap-2 px-4 pb-2">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar obligación..."
                placeholderTextColor="#94a3b8"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <Pressable
                onPress={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="items-center justify-center rounded-xl bg-[#2563eb] px-4 active:opacity-80"
              >
                <Text className="font-semibold text-white">+ Agregar</Text>
              </Pressable>
            </View>

            {/* Filtros */}
            <View className="flex-row flex-wrap gap-2 px-4 pb-3">
              {FILTERS.map((f) => (
                <Pressable
                  key={f.value}
                  onPress={() => setFilter(f.value)}
                  className={`rounded-full px-3 py-1 ${
                    filter === f.value ? 'bg-[#2563eb]' : 'bg-white dark:bg-slate-800'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      filter === f.value ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ObligationCard
            obligation={item}
            paidAmount={paidFor(item.id)}
            year={year}
            month={month}
            paymentMethodLabel={paymentMethodLabel(item.paymentMethodId)}
            baseCurrency={baseCurrency}
            onEdit={() => {
              setEditing(item);
              setFormOpen(true);
            }}
            onDelete={() => confirmDelete(item.id)}
            onPay={() => setPaying(item)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator className="mt-10" color="#2563eb" />
          ) : (
            <Text className="mt-10 text-center text-slate-400">
              No hay obligaciones que mostrar
            </Text>
          )
        }
      />

      <ObligationForm visible={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ObligationPaySheet
        visible={paying !== null}
        onClose={() => setPaying(null)}
        obligation={paying}
      />
    </SafeAreaView>
  );
}

function ObligationCard({
  obligation,
  paidAmount,
  year,
  month,
  paymentMethodLabel,
  baseCurrency,
  onEdit,
  onDelete,
  onPay,
}: {
  obligation: Obligation;
  paidAmount: number;
  year: number;
  month: number;
  paymentMethodLabel: string;
  baseCurrency: string;
  onEdit: () => void;
  onDelete: () => void;
  onPay: () => void;
}) {
  const status = computeStatus(obligation, paidAmount, year, month);
  const icon = OBLIGATION_CATEGORY_ICONS[obligation.cat] ?? '📋';
  const dateLabel = `Día ${obligation.dia}`;
  const showCurrency = obligation.moneda !== baseCurrency;
  const fullyPaid = status.label === 'Pagado';
  const progress = obligation.monto > 0 ? Math.min(paidAmount / obligation.monto, 1) : fullyPaid ? 1 : 0;
  const showProgress = paidAmount > 0 && !fullyPaid;

  return (
    <View
      className="mx-4 mb-2 rounded-2xl bg-white p-3 dark:bg-slate-800"
      style={{ borderLeftWidth: 4, borderLeftColor: status.border, opacity: fullyPaid ? 0.7 : 1 }}
    >
      <View className="flex-row items-center gap-3">
        <Text className="text-2xl">{icon}</Text>

        <View className="flex-1">
          <Text className="font-semibold text-slate-800 dark:text-slate-100" numberOfLines={1}>
            {obligation.nombre}
          </Text>
          <View className="mt-1 flex-row flex-wrap items-center gap-1">
            {dateLabel ? <Pill text={dateLabel} /> : null}
            {obligation.mesFin ? <Pill text={`Hasta ${obligation.mesFin}`} /> : null}
            {obligation.tipo === 'inversion' ? <Pill text="Inv." tone="purple" /> : null}
            {showCurrency ? <Pill text={obligation.moneda} tone="blue" /> : null}
            {paymentMethodLabel ? <Pill text={paymentMethodLabel} tone="green" /> : null}
          </View>
        </View>

        <View className="items-end gap-1">
          <Text className="font-bold text-slate-800 dark:text-slate-100">
            {fmt(obligation.monto, obligation.moneda)}
          </Text>
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: status.badgeBg }}>
            <Text className="text-[11px] font-bold" style={{ color: status.badgeText }}>
              {status.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Barra de progreso para pagos parciales */}
      {showProgress && (
        <View className="mt-2">
          <View className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <View className="h-1.5 rounded-full bg-[#eab308]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </View>
          <Text className="mt-1 text-[11px] text-slate-400">
            {fmt(paidAmount, obligation.moneda)} de {fmt(obligation.monto, obligation.moneda)} · falta{' '}
            {fmt(obligation.monto - paidAmount, obligation.moneda)}
          </Text>
        </View>
      )}

      {/* Acciones */}
      <View className="mt-2 flex-row items-center gap-2">
        <Pressable
          onPress={onPay}
          className={`flex-1 items-center rounded-lg py-2 active:opacity-80 ${fullyPaid ? 'bg-slate-100 dark:bg-slate-700' : 'bg-[#16a34a]'}`}
        >
          <Text className={`text-sm font-semibold ${fullyPaid ? 'text-slate-500 dark:text-slate-300' : 'text-white'}`}>
            {fullyPaid ? 'Ver pagos' : paidAmount > 0 ? 'Pagar saldo' : '💵 Pagar'}
          </Text>
        </Pressable>
        <ActionBtn label="✎" onPress={onEdit} />
        <ActionBtn label="🗑" onPress={onDelete} />
      </View>
    </View>
  );
}

function Pill({ text, tone }: { text: string; tone?: 'blue' | 'green' | 'purple' }) {
  const map = {
    blue: 'text-[#2563eb]',
    green: 'text-[#16a34a]',
    purple: 'text-[#7c3aed]',
  } as const;
  return (
    <View className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 dark:border-slate-600 dark:bg-slate-700">
      <Text className={`text-[11px] font-semibold ${tone ? map[tone] : 'text-slate-500 dark:text-slate-300'}`}>
        {text}
      </Text>
    </View>
  );
}

function ActionBtn({ label, onPress, tint }: { label: string; onPress: () => void; tint?: string }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-8 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600"
    >
      <Text style={{ color: tint ?? '#64748b' }}>{label}</Text>
    </Pressable>
  );
}
