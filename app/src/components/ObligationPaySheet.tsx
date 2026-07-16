import { PM_ICONS, type Obligation } from '@iaas/shared';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Field } from '@/components/ui/Field';
import { Picker, type Option } from '@/components/ui/Picker';
import {
  useDeleteExpense,
  useExpenses,
  usePayObligation,
  usePaymentMethods,
} from '@/hooks/queries';
import { useMonth } from '@/hooks/useMonth';
import { fmt } from '@/lib/format';

type Props = {
  visible: boolean;
  onClose: () => void;
  obligation: Obligation | null;
};

/** Fecha por defecto del pago: día de vencimiento dentro del mes seleccionado. */
function defaultPaymentDate(monthKey: string, dia: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(dia, 1), lastDay);
  return `${monthKey}-${String(d).padStart(2, '0')}`;
}

export function ObligationPaySheet({ visible, onClose, obligation }: Props) {
  const { monthKey, label } = useMonth();
  const { data: pmData } = usePaymentMethods();
  const { data: expenseData } = useExpenses(monthKey);
  const payObligation = usePayObligation();
  const deleteExpense = useDeleteExpense();

  const [amount, setAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [date, setDate] = useState('');

  // Pagos ya registrados de esta obligación este mes.
  const payments = useMemo(
    () => (expenseData?.expenses ?? []).filter((expense) => expense.obligationId === obligation?.id),
    [expenseData, obligation?.id],
  );
  const paidAmount = payments.reduce((sum, payment) => sum + payment.monto, 0);
  const remaining = obligation ? Math.round((obligation.monto - paidAmount) * 100) / 100 : 0;
  const progress =
    obligation && obligation.monto > 0 ? Math.min(paidAmount / obligation.monto, 1) : 0;

  useEffect(() => {
    if (!visible || !obligation) return;
    setAmount(remaining > 0 ? String(remaining) : '');
    setPaymentMethodId(obligation.paymentMethodId ?? '');
    setDate(defaultPaymentDate(monthKey, obligation.dia));
    // Solo al abrir para una obligación/mes: no re-sembrar mientras se edita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, obligation?.id, monthKey]);

  if (!obligation) return null;

  const paymentMethodOptions: Option[] = [
    { value: '', label: 'Sin asignar' },
    ...(pmData?.paymentMethods ?? [])
      .filter((method) => method.active)
      .map((method) => ({ value: method.id, label: `${PM_ICONS[method.type]} ${method.name}` })),
  ];

  async function onPay() {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return Alert.alert('Monto inválido');
    if (parsedAmount > remaining)
      return Alert.alert(
        'Sobrepago',
        `El pago no puede superar el saldo (${fmt(remaining, obligation!.moneda)}). Si el recibo subió, edita el monto del gasto fijo primero.`,
      );
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Fecha inválida', 'Usa AAAA-MM-DD');
    try {
      await payObligation.mutateAsync({
        id: obligation!.id,
        data: { monto: parsedAmount, paymentMethodId: paymentMethodId || null, fecha: date },
      });
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'No se pudo registrar el pago');
    }
  }

  function confirmDeletePayment(id: string) {
    Alert.alert('Deshacer pago', '¿Eliminar este pago?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteExpense.mutate(id) },
    ]);
  }

  const fullyPaid = remaining <= 0;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Pagar · ${obligation.nombre}`}>
      {/* Resumen del pago */}
      <View className="mb-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/40">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-slate-500 dark:text-slate-400">Monto del mes</Text>
          <Text className="font-bold text-slate-800 dark:text-slate-100">{fmt(obligation.monto, obligation.moneda)}</Text>
        </View>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-sm text-slate-500 dark:text-slate-400">Ya pagado</Text>
          <Text className="font-bold text-[#16a34a]">{fmt(paidAmount, obligation.moneda)}</Text>
        </View>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-sm text-slate-500 dark:text-slate-400">Saldo</Text>
          <Text className={`font-bold ${fullyPaid ? 'text-[#16a34a]' : 'text-[#ca8a04]'}`}>
            {fullyPaid ? 'Pagada ✓' : fmt(remaining, obligation.moneda)}
          </Text>
        </View>
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
          <View className="h-2 rounded-full bg-[#16a34a]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </View>
      </View>

      {/* Pagos ya hechos, con deshacer */}
      {payments.length > 0 && (
        <View className="mb-4">
          <Text className="mb-1 text-xs font-bold uppercase text-slate-400">Pagos de {label}</Text>
          {payments.map((payment) => (
            <View key={payment.id} className="flex-row items-center justify-between border-b border-slate-100 py-1.5 dark:border-slate-700">
              <Text className="text-sm text-slate-600 dark:text-slate-300">{payment.fecha}</Text>
              <View className="flex-row items-center gap-3">
                <Text className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(payment.monto, payment.moneda)}</Text>
                <Pressable onPress={() => confirmDeletePayment(payment.id)} className="px-1">
                  <Text className="text-slate-400">✕</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Formulario de pago */}
      {!fullyPaid && (
        <>
          <Field
            label="Monto a pagar *"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            hint={`Saldo pendiente: ${fmt(remaining, obligation.moneda)}`}
          />
          <Picker label="Medio de pago" value={paymentMethodId} options={paymentMethodOptions} onChange={setPaymentMethodId} />
          <Field label="Fecha" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" />
        </>
      )}

      <View className="mt-2 flex-row gap-3">
        <Pressable onPress={onClose} className="flex-1 items-center rounded-xl bg-slate-200 py-3 active:opacity-80 dark:bg-slate-700">
          <Text className="font-semibold text-slate-700 dark:text-slate-200">{fullyPaid ? 'Cerrar' : 'Cancelar'}</Text>
        </Pressable>
        {!fullyPaid && (
          <Pressable onPress={onPay} disabled={payObligation.isPending} className="flex-1 items-center rounded-xl bg-[#16a34a] py-3 active:opacity-80">
            <Text className="font-semibold text-white">{payObligation.isPending ? 'Pagando...' : 'Registrar pago'}</Text>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}
