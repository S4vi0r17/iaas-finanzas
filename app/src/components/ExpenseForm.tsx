import { CURRENCIES, EXPENSE_CATEGORIES, PM_ICONS, type Expense, type ExpenseInput } from '@iaas/shared';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Field } from '@/components/ui/Field';
import { Picker, type Option } from '@/components/ui/Picker';
import { useCreateExpense, useObligations, usePaymentMethods, useUpdateExpense } from '@/hooks/queries';
import { useMonth } from '@/hooks/useMonth';
import { useAuth } from '@/lib/auth';
import { today } from '@/lib/format';

const CURRENCY_OPTIONS: Option[] = CURRENCIES.map((c) => ({ value: c.c, label: `${c.s} ${c.c}` }));
const CATEGORY_OPTIONS: Option[] = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }));

type Props = { visible: boolean; onClose: () => void; editing?: Expense | null };

export function ExpenseForm({ visible, onClose, editing }: Props) {
  const { user } = useAuth();
  const { monthKey } = useMonth();
  const { data: pmData } = usePaymentMethods();
  const { data: oblData } = useObligations(monthKey);
  const create = useCreateExpense();
  const update = useUpdateExpense();

  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState(user?.currency ?? 'PEN');
  const [cat, setCat] = useState('Alimentacion');
  const [catCustom, setCatCustom] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [obligationId, setObligationId] = useState('');
  const [fecha, setFecha] = useState(today());

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setDescripcion(editing.descripcion);
      setMonto(String(editing.monto));
      setMoneda(editing.moneda);
      setCat(editing.cat || 'Alimentacion');
      setCatCustom(editing.catCustom);
      setPaymentMethodId(editing.paymentMethodId ?? '');
      setObligationId(editing.obligationId ?? '');
      setFecha(editing.fecha);
    } else {
      setDescripcion('');
      setMonto('');
      setMoneda(user?.currency ?? 'PEN');
      setCat('Alimentacion');
      setCatCustom('');
      setPaymentMethodId('');
      setObligationId('');
      setFecha(today());
    }
  }, [visible, editing, user?.currency]);

  const pmOptions: Option[] = [
    { value: '', label: 'Sin asignar' },
    ...(pmData?.paymentMethods ?? [])
      .filter((p) => p.active)
      .map((p) => ({ value: p.id, label: `${PM_ICONS[p.type]} ${p.name}` })),
  ];
  const oblOptions: Option[] = [
    { value: '', label: 'Sin relación' },
    ...(oblData?.obligations ?? []).map((o) => ({ value: o.id, label: o.nombre })),
  ];

  async function onSave() {
    if (!descripcion.trim()) return Alert.alert('Falta la descripción');
    const m = parseFloat(monto);
    if (!m || m <= 0) return Alert.alert('Monto inválido');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return Alert.alert('Fecha inválida', 'Usa AAAA-MM-DD');

    const data: ExpenseInput = {
      descripcion: descripcion.trim(),
      monto: m,
      cat,
      catCustom: catCustom.trim(),
      paymentMethodId: paymentMethodId || null,
      obligationId: obligationId || null,
      fecha,
      moneda,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, data });
      else await create.mutateAsync(data);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar');
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
      <Picker label="Categoría" value={cat} options={CATEGORY_OPTIONS} onChange={setCat} />
      <Field
        label="O describe libremente"
        value={catCustom}
        onChangeText={setCatCustom}
        placeholder="Opcional"
      />
      <Picker label="Medio de pago" value={paymentMethodId} options={pmOptions} onChange={setPaymentMethodId} />
      <Picker label="Relacionar con obligación" value={obligationId} options={oblOptions} onChange={setObligationId} />
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
