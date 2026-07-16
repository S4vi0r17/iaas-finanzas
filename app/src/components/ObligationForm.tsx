import {
  CURRENCIES,
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
import { useCategories, usePaymentMethods, useSaveObligation } from '@/hooks/queries';
import { useAuth } from '@/lib/auth';
import { categoryOptions } from '@/lib/categories';

const CURRENCY_OPTIONS: Option[] = CURRENCIES.map((c) => ({ value: c.c, label: `${c.s} ${c.c}` }));

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
function currentMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  editing: Obligation | null;
};

export function ObligationForm({ visible, onClose, editing }: Props) {
  const { user } = useAuth();
  const { data: pmData } = usePaymentMethods();
  const { data: catData } = useCategories('obligacion');
  const save = useSaveObligation();

  const [tipo, setTipo] = useState<'gasto' | 'inversion'>('gasto');
  const [nombre, setNombre] = useState('');
  const [dia, setDia] = useState(String(new Date().getDate()));
  const [mesInicio, setMesInicio] = useState(currentMonth());
  const [mesFin, setMesFin] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState(user?.currency ?? 'PEN');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [cat, setCat] = useState('Otro');
  const [catCustom, setCatCustom] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setTipo(editing.tipo);
      setNombre(editing.nombre);
      setDia(String(editing.dia));
      setMesInicio(editing.mesInicio);
      setMesFin(editing.mesFin ?? '');
      setMonto(String(editing.monto));
      setMoneda(editing.moneda);
      setPaymentMethodId(editing.paymentMethodId ?? '');
      setCat(editing.cat || 'Otro');
      setCatCustom(editing.catCustom);
    } else {
      setTipo('gasto');
      setNombre('');
      setDia(String(new Date().getDate()));
      setMesInicio(currentMonth());
      setMesFin('');
      setMonto('');
      setMoneda(user?.currency ?? 'PEN');
      setPaymentMethodId('');
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
    const diaNum = Number(dia);
    if (!Number.isInteger(diaNum) || diaNum < 1 || diaNum > 31)
      return Alert.alert('Día inválido', 'Ingresa un día del mes entre 1 y 31');
    if (!MONTH_RE.test(mesInicio))
      return Alert.alert('Mes de inicio inválido', 'Usa el formato AAAA-MM');
    if (mesFin && !MONTH_RE.test(mesFin))
      return Alert.alert('Mes de fin inválido', 'Usa el formato AAAA-MM o déjalo vacío');
    if (mesFin && mesFin < mesInicio)
      return Alert.alert('Vigencia inválida', 'El mes de fin no puede ser anterior al de inicio');

    const data: ObligationInput = {
      nombre: nombre.trim(),
      dia: diaNum,
      mesInicio,
      mesFin: mesFin || null,
      monto: parseFloat(monto) || 0,
      cat,
      catCustom: catCustom.trim(),
      tipo,
      moneda,
      paymentMethodId: paymentMethodId || null,
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
        label="Día de vencimiento *"
        value={dia}
        onChangeText={setDia}
        placeholder="1-31"
        keyboardType="number-pad"
        hint="Se repite cada mes (ej. 5 = vence el día 5)"
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field
            label="Vigente desde *"
            value={mesInicio}
            onChangeText={setMesInicio}
            placeholder="AAAA-MM"
          />
        </View>
        <View className="flex-1">
          <Field
            label="Hasta (opcional)"
            value={mesFin}
            onChangeText={setMesFin}
            placeholder="Vigente"
            hint="Vacío = sigue vigente"
          />
        </View>
      </View>

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
        value={paymentMethodId}
        options={pmOptions}
        onChange={setPaymentMethodId}
      />
      <Picker label="Categoría" value={cat} options={categoryOptions(catData?.categories, cat)} onChange={setCat} />
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
