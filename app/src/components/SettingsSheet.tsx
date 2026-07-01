import { PM_GROUPS, PM_ICONS, type PmType } from '@iaas/shared';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Field } from '@/components/ui/Field';
import { useAuth } from '@/lib/auth';
import { usePaymentMethods, useUpdatePaymentMethods, useUpdateUser } from '@/hooks/queries';

type PmDraft = { slot: string; name: string; type: PmType; active: boolean };

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { data } = usePaymentMethods();
  const updateUser = useUpdateUser();
  const updatePms = useUpdatePaymentMethods();

  const [name, setName] = useState('');
  const [pms, setPms] = useState<PmDraft[]>([]);

  // Cargar datos al abrir
  useEffect(() => {
    if (visible) {
      setName(user?.name ?? '');
      if (data?.paymentMethods) {
        setPms(data.paymentMethods.map((p) => ({ ...p })));
      }
    }
  }, [visible, user?.name, data?.paymentMethods]);

  function setPm(slot: string, patch: Partial<PmDraft>) {
    setPms((prev) => prev.map((p) => (p.slot === slot ? { ...p, ...patch } : p)));
  }

  async function save() {
    await updateUser.mutateAsync({ name });
    await updatePms.mutateAsync({
      items: pms.map((p) => ({ slot: p.slot, name: p.name, active: p.active })),
    });
    onClose();
  }

  const busy = updateUser.isPending || updatePms.isPending;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="⚙️ Ajustes">
      <Field label="Tu nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />

      <Text className="mb-2 mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
        💳 Mis medios de pago
      </Text>

      {PM_GROUPS.map((group) => (
        <View key={group.label} className="mb-3">
          <Text className="mb-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            {group.label}
          </Text>
          {group.slots.map((slot) => {
            const pm = pms.find((p) => p.slot === slot);
            if (!pm) return null;
            return (
              <View key={slot} className="mb-1.5 flex-row items-center gap-2">
                <Pressable
                  onPress={() => setPm(slot, { active: !pm.active })}
                  className={`h-6 w-6 items-center justify-center rounded-md border ${
                    pm.active ? 'border-[#2563eb] bg-[#2563eb]' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {pm.active ? <Text className="text-xs font-bold text-white">✓</Text> : null}
                </Pressable>
                <TextInput
                  value={pm.name}
                  editable={pm.active}
                  onChangeText={(t) => setPm(slot, { name: t })}
                  className={`flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
                    pm.active ? '' : 'opacity-40'
                  }`}
                />
                <Text className="w-6 text-center">{PM_ICONS[pm.type]}</Text>
              </View>
            );
          })}
        </View>
      ))}

      <View className="mt-2 flex-row gap-3">
        <Pressable
          onPress={onClose}
          className="flex-1 items-center rounded-xl bg-slate-200 py-3 active:opacity-80 dark:bg-slate-700"
        >
          <Text className="font-semibold text-slate-700 dark:text-slate-200">Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={busy}
          className="flex-1 items-center rounded-xl bg-[#2563eb] py-3 active:opacity-80"
        >
          <Text className="font-semibold text-white">{busy ? 'Guardando...' : 'Guardar'}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
