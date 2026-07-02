import type {
  CreatePaymentMethodInput,
  Expense,
  ExpenseInput,
  Income,
  IncomeInput,
  Obligation,
  ObligationInput,
  PaymentMethod,
  UpdatePaymentMethodInput,
  UpdateUserInput,
  UserProfile,
} from '@iaas/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// ─── Obligaciones ─────────────────────────────────────────────────────
type ObligationsResponse = { obligations: Obligation[]; paidIds: string[] };

export function useObligations(monthKey: string) {
  return useQuery({
    queryKey: ['obligations', monthKey],
    queryFn: () => apiFetch<ObligationsResponse>(`/api/obligations?month=${monthKey}`),
  });
}

export function useSaveObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: ObligationInput }) =>
      id
        ? apiFetch<{ obligation: Obligation }>(`/api/obligations/${id}`, { method: 'PATCH', body: data })
        : apiFetch<{ obligation: Obligation }>('/api/obligations', { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obligations'] }),
  });
}

export function useDeleteObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/obligations/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obligations'] }),
  });
}

export function useReorderObligations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiFetch('/api/obligations/reorder', { method: 'PATCH', body: { orderedIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obligations'] }),
  });
}

// ─── Gastos ───────────────────────────────────────────────────────────
export function useExpenses(monthKey: string) {
  return useQuery({
    queryKey: ['expenses', monthKey],
    queryFn: () => apiFetch<{ expenses: Expense[] }>(`/api/expenses?month=${monthKey}`),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseInput) =>
      apiFetch<{ expense: Expense }>('/api/expenses', { method: 'POST', body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      // "Pagada" de una obligación se deriva de sus gastos ligados.
      qc.invalidateQueries({ queryKey: ['obligations'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['obligations'] });
    },
  });
}

// ─── Ingresos ─────────────────────────────────────────────────────────
export function useIncomes(monthKey: string) {
  return useQuery({
    queryKey: ['incomes', monthKey],
    queryFn: () => apiFetch<{ incomes: Income[] }>(`/api/incomes?month=${monthKey}`),
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IncomeInput) =>
      apiFetch<{ income: Income }>('/api/incomes', { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/incomes/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }),
  });
}

// ─── Medios de pago ───────────────────────────────────────────────────
export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => apiFetch<{ paymentMethods: PaymentMethod[] }>('/api/payment-methods'),
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePaymentMethodInput) =>
      apiFetch<{ paymentMethod: PaymentMethod }>('/api/payment-methods', {
        method: 'POST',
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdatePaymentMethodInput & { id: string }) =>
      apiFetch<{ paymentMethod: PaymentMethod }>(`/api/payment-methods/${id}`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-methods'] });
      qc.invalidateQueries({ queryKey: ['obligations'] });
    },
  });
}

// ─── Usuario ──────────────────────────────────────────────────────────
export function useUpdateUser() {
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: (patch: UpdateUserInput) =>
      apiFetch<{ user: UserProfile }>('/api/me', { method: 'PATCH', body: patch }),
    onSuccess: (res) => setUser(res.user),
  });
}
