import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from './BottomSheet';

export type Option = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
};

/** Selector estilo <select>: campo que abre una lista en bottom sheet. */
export function Picker({ label, value, options, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-700"
      >
        <Text className={selected ? 'text-base text-slate-800 dark:text-slate-100' : 'text-base text-slate-400'}>
          {selected?.label ?? placeholder ?? 'Selecciona...'}
        </Text>
        <Text className="text-slate-400">▾</Text>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`mb-1 flex-row items-center justify-between rounded-xl px-4 py-3 ${
                active ? 'bg-blue-50 dark:bg-blue-900/30' : ''
              }`}
            >
              <Text className="text-base text-slate-800 dark:text-slate-100">{o.label}</Text>
              {active ? <Text className="font-bold text-[#2563eb]">✓</Text> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}
