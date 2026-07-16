import type { Category } from '@iaas/shared';

import type { Option } from '@/components/ui/Picker';

/**
 * Convierte las categorías (de un scope) en opciones para el Picker, mostrando
 * solo las activas. Conserva el valor `current` aunque su categoría esté
 * desactivada, sea personalizada o venga de datos antiguos, para no perderlo al
 * editar un registro.
 */
export function categoryOptions(cats: Category[] | undefined, current: string): Option[] {
  const options = (cats ?? [])
    .filter((c) => c.active)
    .map((c) => ({ value: c.name, label: `${c.icon} ${c.name}`.trim() }));
  if (current && !options.some((o) => o.value === current)) {
    options.unshift({ value: current, label: current });
  }
  return options;
}
