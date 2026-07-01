import { ScrollView, Text, View } from 'react-native';

export type Metric = { value: string; label: string; color?: string };

/** Fila horizontal de chips con métricas (como en el HTML). */
export function Metrics({ items }: { items: Metric[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-3"
    >
      {items.map((m, i) => (
        <View
          key={i}
          className="min-w-[80px] items-center rounded-2xl bg-white px-3 py-2 shadow-sm dark:bg-slate-800"
        >
          <Text className="text-base font-extrabold" style={m.color ? { color: m.color } : undefined}>
            {m.value}
          </Text>
          <Text className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{m.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
