import {
  CATEGORY_SCOPES,
  CATEGORY_SCOPE_LABELS,
  DEFAULT_CATEGORY_ICON,
  type Category,
  type CategoryScope,
} from '@iaas/shared';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Segmented } from '@/components/ui/Segmented';
import { useCategories, useCreateCategory, useUpdateCategory } from '@/hooks/queries';

const SCOPE_COLORS: Record<CategoryScope, string> = {
  obligacion: '#2563eb',
  gasto: '#ea580c',
  ingreso: '#16a34a',
};

const SCOPE_SEGMENTS = CATEGORY_SCOPES.map((s) => ({
  value: s,
  label: CATEGORY_SCOPE_LABELS[s],
  activeColor: SCOPE_COLORS[s],
}));

/** Fila de una categoría existente. Guarda cada cambio al instante. */
function CatRow({ cat }: { cat: Category }) {
  const update = useUpdateCategory();
  const [name, setName] = useState(cat.name);
  const [icon, setIcon] = useState(cat.icon);

  // Resincroniza si el dato del servidor cambia (ej. tras recargar).
  useEffect(() => setName(cat.name), [cat.name]);
  useEffect(() => setIcon(cat.icon), [cat.icon]);

  function saveName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== cat.name) update.mutate({ id: cat.id, name: trimmed });
    else setName(cat.name);
  }

  function saveIcon() {
    const trimmed = icon.trim();
    if (trimmed !== cat.icon) update.mutate({ id: cat.id, icon: trimmed });
  }

  return (
    <View className="mb-1.5 flex-row items-center gap-2">
      <Pressable
        onPress={() => update.mutate({ id: cat.id, active: !cat.active })}
        className={`h-6 w-6 items-center justify-center rounded-md border ${
          cat.active ? 'border-[#2563eb] bg-[#2563eb]' : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {cat.active ? <Text className="text-xs font-bold text-white">✓</Text> : null}
      </Pressable>
      <TextInput
        value={icon}
        onChangeText={setIcon}
        onEndEditing={saveIcon}
        onBlur={saveIcon}
        placeholder={DEFAULT_CATEGORY_ICON}
        className="h-10 w-11 rounded-lg border border-slate-200 bg-slate-50 text-center text-base dark:border-slate-600 dark:bg-slate-700"
      />
      <TextInput
        value={name}
        onChangeText={setName}
        onEndEditing={saveName}
        onBlur={saveName}
        className={`flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
          cat.active ? '' : 'opacity-40'
        }`}
      />
    </View>
  );
}

export function CategoriesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data } = useCategories();
  const createCat = useCreateCategory();

  const [scope, setScope] = useState<CategoryScope>('obligacion');
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');

  const cats = (data?.categories ?? []).filter((c) => c.scope === scope);

  async function addCat() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await createCat.mutateAsync({ scope, name: trimmed, icon: newIcon.trim(), active: true });
    setNewName('');
    setNewIcon('');
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="🏷 Mis categorías">
      <Segmented value={scope} segments={SCOPE_SEGMENTS} onChange={(v) => setScope(v as CategoryScope)} />
      <Text className="mb-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
        Toca el emoji o el nombre para editarlos. Desmarca la casilla para ocultar una categoría de
        los formularios (los registros anteriores la conservan).
      </Text>

      {cats.length === 0 ? (
        <Text className="mb-2 text-sm text-slate-400">Aún no hay categorías en este grupo.</Text>
      ) : (
        cats.map((cat) => <CatRow key={cat.id} cat={cat} />)
      )}

      {/* Agregar una categoría nueva */}
      <View className="mt-2 rounded-xl border border-slate-200 p-2 dark:border-slate-600">
        <Text className="mb-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
          ＋ Agregar categoría en {CATEGORY_SCOPE_LABELS[scope]}
        </Text>
        <View className="flex-row gap-2">
          <TextInput
            value={newIcon}
            onChangeText={setNewIcon}
            placeholder={DEFAULT_CATEGORY_ICON}
            placeholderTextColor="#94a3b8"
            className="h-10 w-11 rounded-lg border border-slate-200 bg-slate-50 text-center text-base dark:border-slate-600 dark:bg-slate-700"
          />
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Nombre de la categoría"
            placeholderTextColor="#94a3b8"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <Pressable
            onPress={addCat}
            disabled={createCat.isPending || !newName.trim()}
            className="items-center justify-center rounded-lg bg-[#2563eb] px-4 active:opacity-80"
          >
            <Text className="font-semibold text-white">Añadir</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={onClose}
        className="mt-3 items-center rounded-xl bg-slate-200 py-3 active:opacity-80 dark:bg-slate-700"
      >
        <Text className="font-semibold text-slate-700 dark:text-slate-200">Listo</Text>
      </Pressable>
    </BottomSheet>
  );
}
