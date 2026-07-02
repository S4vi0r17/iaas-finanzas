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
import { AppHeader } from '@/components/ui/AppHeader';
import { Metrics, type Metric } from '@/components/ui/Metrics';
import {
  useDeleteObligation,
  useObligations,
  usePaymentMethods,
  useTogglePaid,
} from '@/hooks/queries';
import { useMonth } from '@/hooks/useMonth';
import { useAuth } from '@/lib/auth';
import { fmt, fmtShort, formatDate } from '@/lib/format';
import { computeStatus, type StatusKey } from '@/lib/obligationStatus';

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Proximo', label: 'Próximo' },
  { value: 'Retrasado', label: 'Retrasado' },
  { value: 'Pagado', label: 'Pagado' },
];

export default function ObligacionesScreen() {
  const { user } = useAuth();
  const { monthKey, year, month } = useMonth();
  const { data, isLoading } = useObligations(monthKey);
  const { data: pmData } = usePaymentMethods();
  const togglePaid = useTogglePaid();
  const deleteObl = useDeleteObligation();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Obligation | null>(null);

  const baseCurrency = user?.currency ?? 'PEN';
  const obligations = data?.obligations ?? [];
  const paidIds = data?.paidIds ?? [];

  function pmLabel(id: string) {
    const pm = pmData?.paymentMethods.find((p) => p.id === id);
    return pm ? `${PM_ICONS[pm.type]} ${pm.name}` : '';
  }

  const metrics = useMemo<Metric[]>(() => {
    let tot = 0;
    let retrasadas = 0;
    let inversiones = 0;
    for (const o of obligations) {
      if (o.moneda === baseCurrency) tot += o.monto;
      if (o.tipo === 'inversion') inversiones++;
      const st = computeStatus(o, paidIds.includes(o.id), year, month).label;
      if (st === 'Retrasado') retrasadas++;
    }
    return [
      { value: fmtShort(tot, baseCurrency), label: `Total ${baseCurrency}` },
      {
        value: String(obligations.length),
        label: user?.isPro ? 'Total' : `Total/${MAX_FREE_OBLIGATIONS}`,
      },
      { value: String(paidIds.length), label: 'Pagadas', color: '#16a34a' },
      { value: String(retrasadas), label: 'Retrasadas', color: retrasadas ? '#dc2626' : undefined },
      { value: String(inversiones), label: 'Inversiones', color: '#7c3aed' },
    ];
  }, [obligations, paidIds, baseCurrency, year, month, user?.isPro]);

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return obligations.filter((o) => {
      const st = computeStatus(o, paidIds.includes(o.id), year, month).label;
      const matchFilter =
        !filter || st === filter || (filter === 'Proximo' && st === 'Vence hoy');
      const matchSearch = !q || o.nombre.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [obligations, paidIds, search, filter, year, month]);

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
            o={item}
            paid={paidIds.includes(item.id)}
            year={year}
            month={month}
            pmLabel={pmLabel(item.metodoPago)}
            baseCurrency={baseCurrency}
            onToggle={() =>
              togglePaid.mutate({ id: item.id, monthKey, paid: !paidIds.includes(item.id) })
            }
            onEdit={() => {
              setEditing(item);
              setFormOpen(true);
            }}
            onDelete={() => confirmDelete(item.id)}
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
    </SafeAreaView>
  );
}

function ObligationCard({
  o,
  paid,
  year,
  month,
  pmLabel,
  baseCurrency,
  onToggle,
  onEdit,
  onDelete,
}: {
  o: Obligation;
  paid: boolean;
  year: number;
  month: number;
  pmLabel: string;
  baseCurrency: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = computeStatus(o, paid, year, month);
  const icon = OBLIGATION_CATEGORY_ICONS[o.cat] ?? '📋';
  const dateLabel = o.fechaVenc ? formatDate(o.fechaVenc) : o.dia ? `Día ${o.dia}` : '';
  const showCurrency = o.moneda !== baseCurrency;

  return (
    <View
      className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl bg-white p-3 dark:bg-slate-800"
      style={{ borderLeftWidth: 4, borderLeftColor: status.border, opacity: paid ? 0.65 : 1 }}
    >
      <Text className="text-2xl">{icon}</Text>

      <View className="flex-1">
        <Text className="font-semibold text-slate-800 dark:text-slate-100" numberOfLines={1}>
          {o.nombre}
        </Text>
        <View className="mt-1 flex-row flex-wrap items-center gap-1">
          {dateLabel ? <Pill text={dateLabel} /> : null}
          {o.tipo === 'inversion' ? <Pill text="Inv." tone="purple" /> : null}
          {showCurrency ? <Pill text={o.moneda} tone="blue" /> : null}
          {pmLabel ? <Pill text={pmLabel} tone="green" /> : null}
        </View>
        <View className="mt-2 flex-row gap-2">
          <ActionBtn label={paid ? '✓' : '○'} onPress={onToggle} tint={paid ? '#16a34a' : '#64748b'} />
          <ActionBtn label="✎" onPress={onEdit} />
          <ActionBtn label="🗑" onPress={onDelete} />
        </View>
      </View>

      <View className="items-end gap-1">
        <Text className="font-bold text-slate-800 dark:text-slate-100">
          {fmt(o.monto, o.moneda)}
        </Text>
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: status.badgeBg }}>
          <Text className="text-[11px] font-bold" style={{ color: status.badgeText }}>
            {status.label}
          </Text>
        </View>
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
