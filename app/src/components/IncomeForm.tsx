import { CURRENCIES, type Income, type IncomeInput } from '@iaas/shared';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Field } from '@/components/ui/Field';
import { Picker, type Option } from '@/components/ui/Picker';
import { useCategories, useCreateIncome, useUpdateIncome } from '@/hooks/queries';
import { useAuth } from '@/lib/auth';
import { categoryOptions } from '@/lib/categories';
import { today } from '@/lib/format';

const CURRENCY_OPTIONS: Option[] = CURRENCIES.map((c) => ({ value: c.c, label: `${c.s} ${c.c}` }));

type Props = { visible: boolean; onClose: () => void; editing?: Income | null };

export function IncomeForm({ visible, onClose, editing }: Props) {
  const { user } = useAuth();
  const { data: catData } = useCategories('ingreso');
  const create = useCreateIncome();
  const update = useUpdateIncome();

  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState(user?.currency ?? 'PEN');
  const [cat, setCat] = useState('Sueldo');
  const [fecha, setFecha] = useState(today());

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setDescripcion(editing.descripcion);
      setMonto(String(editing.monto));
      setMoneda(editing.moneda);
      setCat(editing.cat || 'Sueldo');
      setFecha(editing.fecha);
    } else {
      setDescripcion('');
      setMonto('');
      setMoneda(user?.currency ?? 'PEN');
      setCat('Sueldo');
      setFecha(today());
    }
  }, [visible, editing, user?.currency]);

  async function onSave() {
    if (!descripcion.trim()) return Alert.alert('Falta la descripción');
    const m = parseFloat(monto);
    if (!m || m <= 0) return Alert.alert('Monto inválido');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return Alert.alert('Fecha inválida', 'Usa AAAA-MM-DD');

    const data: IncomeInput = {
      descripcion: descripcion.trim(),
      monto: m,
      cat,
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
    <BottomSheet visible={visible} onClose={onClose} title={editing ? 'Editar ingreso' : 'Nuevo ingreso'}>
      <Field
        label="Descripción *"
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Ej: Sueldo, Consultoría..."
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
          className="flex-1 items-center rounded-xl bg-[#16a34a] py-3 active:opacity-80"
        >
          <Text className="font-semibold text-white">{busy ? 'Guardando...' : 'Guardar'}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
