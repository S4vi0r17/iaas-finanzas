import { Pressable, Text, View } from 'react-native';

export type Segment = { value: string; label: string; activeColor: string };

type Props = {
  value: string;
  segments: Segment[];
  onChange: (value: string) => void;
};

/** Control segmentado (ej: Gasto / Inversion). */
export function Segmented({ value, segments, onChange }: Props) {
  return (
    <View className="flex-row overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600">
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => onChange(s.value)}
            className="flex-1 items-center py-2.5"
            style={active ? { backgroundColor: s.activeColor } : undefined}
          >
            <Text
              className={active ? 'font-semibold text-white' : 'text-slate-500 dark:text-slate-400'}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
