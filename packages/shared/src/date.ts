/**
 * Fecha de vencimiento concreta para el mes seleccionado, a partir del día
 * recurrente de la obligación. Si el día no existe en el mes (ej. 31 en
 * febrero), se ajusta al último día del mes.
 */
export function dueDate(dia: number, selYear: number, selMonth: number): Date {
  const lastDay = new Date(selYear, selMonth, 0).getDate();
  const d = Math.min(Math.max(dia, 1), lastDay);
  return new Date(selYear, selMonth - 1, d);
}
