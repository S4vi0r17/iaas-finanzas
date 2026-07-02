import {
  CURRENCIES,
  OBLIGATION_CATEGORIES,
  PM_ICONS,
  type Obligation,
  type ObligationInput,
} from '@iaas/shared';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Field } from '@/components/ui/Field';
import { Picker, type Option } from '@/components/ui/Picker';
import { Segmented } from '@/components/ui/Segmented';
import { usePaymentMethods, useSaveObligation } from '@/hooks/queries';
import { useAuth } from '@/lib/auth';
import { today } from '@/lib/format';

const CURRENCY_OPTIONS: Option[] = CURRENCIES.map((c) => ({ value: c.c, label: `${c.s} ${c.c}` }));
const CATEGORY_OPTIONS: Option[] = OBLIGATION_CATEGORIES.map((c) => ({ value: c, label: c }));

type Props = {
  visible: boolean;
  onClose: () => void;
  editing: Obligation | null;
};

export function ObligationForm({ visible, onClose, editing }: Props) {
  const { user } = useAuth();
  const { data: pmData } = usePaymentMethods();
  const save = useSaveObligation();

  const [tipo, setTipo] = useState<'gasto' | 'inversion'>('gasto');
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(today());
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState(user?.currency ?? 'PEN');
  const [metodoPago, setMetodoPago] = useState('');
  const [cat, setCat] = useState('Otro');
  const [catCustom, setCatCustom] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setTipo(editing.tipo);
      setNombre(editing.nombre);
      setFecha(editing.fechaVenc || today());
      setMonto(String(editing.monto));
      setMoneda(editing.moneda);
      setMetodoPago(editing.metodoPago);
      setCat(editing.cat || 'Otro');
      setCatCustom(editing.catCustom);
    } else {
      setTipo('gasto');
      setNombre('');
      setFecha(today());
      setMonto('');
      setMoneda(user?.currency ?? 'PEN');
      setMetodoPago('');
      setCat('Otro');
      setCatCustom('');
    }
  }, [visible, editing, user?.currency]);

  const pmOptions: Option[] = [
    { value: '', label: 'Sin asignar' },
    ...(pmData?.paymentMethods ?? [])
      .filter((p) => p.active)
      .map((p) => ({ value: p.id, label: `${PM_ICONS[p.type]} ${p.name}` })),
  ];

  async function onSave() {
    if (!nombre.trim()) return Alert.alert('Falta la descripción');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return Alert.alert('Fecha inválida', 'Usa el formato AAAA-MM-DD');

    const data: ObligationInput = {
      nombre: nombre.trim(),
      fechaVenc: fecha,
      dia: Number(fecha.split('-')[2]) || 1,
      monto: parseFloat(monto) || 0,
      cat,
      catCustom: catCustom.trim(),
      tipo,
      moneda,
      metodoPago,
    };

    try {
      await save.mutateAsync({ id: editing?.id, data });
      onClose();
    } catch (e: any) {
      if (e?.status === 403) {
        Alert.alert('Límite alcanzado', 'El plan gratuito permite hasta 10 obligaciones.');
      } else {
        Alert.alert('Error', e?.message ?? 'No se pudo guardar');
      }
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar obligación' : 'Nueva obligación'}
    >
      <View className="mb-3">
        <Text className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Tipo</Text>
        <Segmented
          value={tipo}
          onChange={(v) => setTipo(v as 'gasto' | 'inversion')}
          segments={[
            { value: 'gasto', label: 'Gasto', activeColor: '#2563eb' },
            { value: 'inversion', label: 'Inversion', activeColor: '#7c3aed' },
          ]}
        />
        <Text className="mt-1 text-xs text-slate-400">
          Inversión: genera retorno (hipoteca, ahorro)
        </Text>
      </View>

      <Field
        label="Descripción *"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ej: Hipoteca BCP, Visa Scotiabank"
      />
      <Field
        label="Fecha de vencimiento *"
        value={fecha}
        onChangeText={setFecha}
        placeholder="AAAA-MM-DD"
        hint="Formato: 2026-06-15"
      />

      <View className="flex-row gap-3">
        <View className="flex-[2]">
          <Field
            label="Monto"
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

      <Picker
        label="Medio de pago"
        value={metodoPago}
        options={pmOptions}
        onChange={setMetodoPago}
      />
      <Picker label="Categoría" value={cat} options={CATEGORY_OPTIONS} onChange={setCat} />
      <Field
        label="O categoría personalizada"
        value={catCustom}
        onChangeText={setCatCustom}
        placeholder="Opcional"
      />

      <View className="mt-2 flex-row gap-3">
        <Pressable
          onPress={onClose}
          className="flex-1 items-center rounded-xl bg-slate-200 py-3 active:opacity-80 dark:bg-slate-700"
        >
          <Text className="font-semibold text-slate-700 dark:text-slate-200">Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={save.isPending}
          className="flex-1 items-center rounded-xl bg-[#2563eb] py-3 active:opacity-80"
        >
          <Text className="font-semibold text-white">
            {save.isPending ? 'Guardando...' : 'Guardar'}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
