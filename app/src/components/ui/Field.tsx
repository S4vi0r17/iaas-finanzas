import { Text, TextInput, View } from 'react-native';

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string; hint?: string };

/** Campo de texto etiquetado para los formularios. */
export function Field({ label, hint, ...props }: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </Text>
      <TextInput
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {hint ? <Text className="mt-1 text-xs text-slate-400">{hint}</Text> : null}
    </View>
  );
}
