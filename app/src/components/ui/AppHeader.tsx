import { CURRENCIES, currencySymbol } from '@iaas/shared';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SettingsSheet } from '@/components/SettingsSheet';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useUpdateUser } from '@/hooks/queries';
import { useMonth } from '@/hooks/useMonth';
import { useAuth } from '@/lib/auth';

export function AppHeader({ title, showMonthNav = true }: { title: string; showMonthNav?: boolean }) {
  const { user } = useAuth();
  const { label, shortLabel, next, prev } = useMonth();
  const updateUser = useUpdateUser();
  const [curOpen, setCurOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <View className="bg-[#2563eb] px-4 pb-3 pt-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-[11px] text-white/80">
            {greet}
            {user?.name ? `, ${user.name}` : ''}
          </Text>
          <Text className="text-base font-bold text-white">{title}</Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <HeaderBtn label={currencySymbol(user?.currency ?? 'PEN')} onPress={() => setCurOpen(true)} />
          {showMonthNav && (
            <View className="flex-row items-center">
              <HeaderBtn label="‹" onPress={prev} />
              <Text className="mx-1 min-w-[30px] text-center text-xs font-bold text-white">
                {shortLabel}
              </Text>
              <HeaderBtn label="›" onPress={next} />
            </View>
          )}
          <HeaderBtn label="⚙️" onPress={() => setSetOpen(true)} />
        </View>
      </View>

      {showMonthNav && <Text className="mt-1 text-[11px] text-white/70">{label}</Text>}

      {/* Selector de moneda base */}
      <BottomSheet visible={curOpen} onClose={() => setCurOpen(false)} title="Moneda base">
        <Text className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Moneda del balance general. Cada ítem puede tener su propia moneda.
        </Text>
        {CURRENCIES.map((c) => {
          const active = c.c === user?.currency;
          return (
            <Pressable
              key={c.c}
              onPress={() => {
                updateUser.mutate({ currency: c.c });
                setCurOpen(false);
              }}
              className={`mb-1 flex-row items-center gap-3 rounded-xl px-4 py-3 ${
                active ? 'bg-blue-50 dark:bg-blue-900/30' : ''
              }`}
            >
              <Text className="w-10 text-base font-extrabold text-[#2563eb]">{c.s}</Text>
              <Text className="flex-1 text-base text-slate-800 dark:text-slate-100">{c.n}</Text>
              {active ? <Text className="font-bold text-[#2563eb]">✓</Text> : null}
            </Pressable>
          );
        })}
      </BottomSheet>

      <SettingsSheet visible={setOpen} onClose={() => setSetOpen(false)} />
    </View>
  );
}

function HeaderBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[32px] items-center justify-center rounded-lg bg-white/20 px-2.5 py-1 active:bg-white/40"
    >
      <Text className="text-sm font-bold text-white">{label}</Text>
    </Pressable>
  );
}
