import {
  PM_ICONS,
  PM_TYPES,
  PM_TYPE_OPTIONS,
  type PaymentMethod,
  type PmType,
} from '@iaas/shared';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Field } from '@/components/ui/Field';
import { useAuth } from '@/lib/auth';
import {
  useCreatePaymentMethod,
  usePaymentMethods,
  useUpdatePaymentMethod,
  useUpdateUser,
} from '@/hooks/queries';

/** Fila de un medio de pago existente. Guarda cada cambio al instante. */
function PmRow({ pm }: { pm: PaymentMethod }) {
  const update = useUpdatePaymentMethod();
  const [name, setName] = useState(pm.name);

  // Resincroniza si el dato del servidor cambia (ej. tras recargar).
  useEffect(() => setName(pm.name), [pm.name]);

  function cycleType() {
    const next = PM_TYPES[(PM_TYPES.indexOf(pm.type) + 1) % PM_TYPES.length];
    update.mutate({ id: pm.id, type: next });
  }

  function saveName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== pm.name) update.mutate({ id: pm.id, name: trimmed });
    else setName(pm.name);
  }

  return (
    <View className="mb-1.5 flex-row items-center gap-2">
      <Pressable
        onPress={() => update.mutate({ id: pm.id, active: !pm.active })}
        className={`h-6 w-6 items-center justify-center rounded-md border ${
          pm.active ? 'border-[#2563eb] bg-[#2563eb]' : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {pm.active ? <Text className="text-xs font-bold text-white">✓</Text> : null}
      </Pressable>
      <TextInput
        value={name}
        onChangeText={setName}
        onEndEditing={saveName}
        onBlur={saveName}
        className={`flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
          pm.active ? '' : 'opacity-40'
        }`}
      />
      <Pressable onPress={cycleType} className="h-9 w-9 items-center justify-center">
        <Text className="text-lg">{PM_ICONS[pm.type]}</Text>
      </Pressable>
    </View>
  );
}

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { data } = usePaymentMethods();
  const updateUser = useUpdateUser();
  const createPm = useCreatePaymentMethod();

  const [name, setName] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<PmType>('credito');

  useEffect(() => {
    if (visible) setName(user?.name ?? '');
  }, [visible, user?.name]);

  async function addPm() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await createPm.mutateAsync({ name: trimmed, type: newType, active: true });
    setNewName('');
    setNewType('credito');
  }

  async function save() {
    if (name.trim() !== (user?.name ?? '')) await updateUser.mutateAsync({ name: name.trim() });
    onClose();
  }

  const pms = data?.paymentMethods ?? [];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="⚙️ Ajustes">
      <Field label="Tu nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />

      <Text className="mb-1 mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
        💳 Mis medios de pago
      </Text>
      <Text className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        Toca el ícono para cambiar el tipo. Desmarca la casilla para desactivarlo.
      </Text>

      {pms.map((pm) => (
        <PmRow key={pm.id} pm={pm} />
      ))}

      {/* Agregar un medio de pago nuevo */}
      <View className="mt-2 rounded-xl border border-slate-200 p-2 dark:border-slate-600">
        <Text className="mb-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
          ＋ Agregar medio de pago
        </Text>
        <View className="mb-2 flex-row flex-wrap gap-1.5">
          {PM_TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setNewType(opt.value)}
              className={`rounded-lg border px-2 py-1 ${
                newType === opt.value
                  ? 'border-[#2563eb] bg-[#2563eb]'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              <Text
                className={`text-xs ${
                  newType === opt.value ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row gap-2">
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Nombre del medio"
            placeholderTextColor="#94a3b8"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <Pressable
            onPress={addPm}
            disabled={createPm.isPending || !newName.trim()}
            className="items-center justify-center rounded-lg bg-[#2563eb] px-4 active:opacity-80"
          >
            <Text className="font-semibold text-white">Añadir</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-3 flex-row gap-3">
        <Pressable
          onPress={onClose}
          className="flex-1 items-center rounded-xl bg-slate-200 py-3 active:opacity-80 dark:bg-slate-700"
        >
          <Text className="font-semibold text-slate-700 dark:text-slate-200">Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={updateUser.isPending}
          className="flex-1 items-center rounded-xl bg-[#2563eb] py-3 active:opacity-80"
        >
          <Text className="font-semibold text-white">
            {updateUser.isPending ? 'Guardando...' : 'Guardar'}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
