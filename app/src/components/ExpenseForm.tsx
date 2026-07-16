import { CURRENCIES, PM_ICONS, type Expense, type ExpenseInput } from '@iaas/shared';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Field } from '@/components/ui/Field';
import { Picker, type Option } from '@/components/ui/Picker';
import { useCategories, useCreateExpense, usePaymentMethods, useUpdateExpense } from '@/hooks/queries';
import { useAuth } from '@/lib/auth';
import { categoryOptions } from '@/lib/categories';
import { today } from '@/lib/format';

const CURRENCY_OPTIONS: Option[] = CURRENCIES.map((c) => ({ value: c.c, label: `${c.s} ${c.c}` }));

type Props = { visible: boolean; onClose: () => void; editing?: Expense | null };

export function ExpenseForm({ visible, onClose, editing }: Props) {
  const { user } = useAuth();
  const { data: pmData } = usePaymentMethods();
  const { data: catData } = useCategories('gasto');
  const create = useCreateExpense();
  const update = useUpdateExpense();

  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState(user?.currency ?? 'PEN');
  const [cat, setCat] = useState('Alimentacion');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [fecha, setFecha] = useState(today());

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setDescripcion(editing.descripcion);
      setMonto(String(editing.monto));
      setMoneda(editing.moneda);
      setCat(editing.cat || 'Alimentacion');
      setPaymentMethodId(editing.paymentMethodId ?? '');
      setFecha(editing.fecha);
    } else {
      setDescripcion('');
      setMonto('');
      setMoneda(user?.currency ?? 'PEN');
      setCat('Alimentacion');
      setPaymentMethodId('');
      setFecha(today());
    }
  }, [visible, editing, user?.currency]);

  const paymentMethodOptions: Option[] = [
    { value: '', label: 'Sin asignar' },
    ...(pmData?.paymentMethods ?? [])
      .filter((method) => method.active)
      .map((method) => ({ value: method.id, label: `${PM_ICONS[method.type]} ${method.name}` })),
  ];

  async function onSave() {
    if (!descripcion.trim()) return Alert.alert('Falta la descripción');
    const amount = parseFloat(monto);
    if (!amount || amount <= 0) return Alert.alert('Monto inválido');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return Alert.alert('Fecha inválida', 'Usa AAAA-MM-DD');

    // Los gastos creados aquí son variables. Si se edita un gasto que era pago
    // de obligación, se preservan su vínculo y clasificación (no se pierden).
    const data: ExpenseInput = {
      descripcion: descripcion.trim(),
      monto: amount,
      cat,
      paymentMethodId: paymentMethodId || null,
      obligationId: editing?.obligationId ?? null,
      tipo: editing?.tipo ?? 'variable',
      fecha,
      moneda,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, data });
      else await create.mutateAsync(data);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'No se pudo guardar');
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={editing ? 'Editar gasto' : 'Nuevo gasto'}>
      <Field
        label="Descripción *"
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="¿En qué gastaste?"
      />
      <View className="flex-row gap-3">
        <View className="flex-[2]">
          <Field
            label="Monto *"
            value={monto}
            onChangeText={setMonto}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>
        <View className="flex-1">
          <Picker label="Moneda" value={moneda} options={CURRENCY_OPTIONS} onChange={setMoneda} />
        </View>
      </View>
      <Picker label="Categoría" value={cat} options={categoryOptions(catData?.categories, cat)} onChange={setCat} />
      <Picker label="Medio de pago" value={paymentMethodId} options={paymentMethodOptions} onChange={setPaymentMethodId} />
      <Field label="Fecha" value={fecha} onChangeText={setFecha} placeholder="AAAA-MM-DD" />

      <View className="mt-2 flex-row gap-3">
        <Pressable
          onPress={onClose}
          className="flex-1 items-center rounded-xl bg-slate-200 py-3 active:opacity-80 dark:bg-slate-700"
        >
          <Text className="font-semibold text-slate-700 dark:text-slate-200">Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={busy}
          className="flex-1 items-center rounded-xl bg-[#ea580c] py-3 active:opacity-80"
        >
          <Text className="font-semibold text-white">{busy ? 'Guardando...' : 'Guardar'}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
