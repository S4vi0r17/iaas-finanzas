import { PM_ICONS, currencySymbol } from '@iaas/shared';
import { useMemo } from 'react';
import { ScrollView, Text, View, type DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { useExpenses, useIncomes, useObligations, usePaymentMethods } from '@/hooks/queries';
import { useMonth } from '@/hooks/useMonth';
import { useAuth } from '@/lib/auth';
import { fmt } from '@/lib/format';

const barWidth = (pct: number): DimensionValue => `${Math.max(0, Math.min(100, Math.round(pct)))}%`;

type Bucket = {
  income: number;
  fixed: number; // gastos snapshot 'fijo' (pagos de obligación tipo gasto)
  variable: number; // gastos snapshot 'variable' (gasto suelto)
  investment: number; // gastos snapshot 'inversion'
  pendingExpense: number; // saldo de obligaciones gasto sin pagar
  pendingInvestment: number; // saldo de obligaciones inversión sin pagar
};
type PaymentMethodStat = {
  name: string;
  icon: string;
  total: number;
  count: number;
  categories: Record<string, number>;
};

const emptyBucket = (): Bucket => ({
  income: 0,
  fixed: 0,
  variable: 0,
  investment: 0,
  pendingExpense: 0,
  pendingInvestment: 0,
});

export default function ResumenScreen() {
  const { user } = useAuth();
  const { monthKey, label } = useMonth();
  const { data: obligationData } = useObligations(monthKey);
  const { data: expenseData } = useExpenses(monthKey);
  const { data: incomeData } = useIncomes(monthKey);
  const { data: pmData } = usePaymentMethods();

  const baseCurrency = user?.currency ?? 'PEN';
  const obligations = obligationData?.obligations ?? [];
  const paidByObligation = obligationData?.paidByObligation ?? {};
  const expenses = expenseData?.expenses ?? [];
  const incomes = incomeData?.incomes ?? [];

  function paymentMethodName(id: string) {
    return pmData?.paymentMethods.find((method) => method.id === id)?.name ?? id;
  }
  function paymentMethodIcon(id: string) {
    const paymentMethod = pmData?.paymentMethods.find((method) => method.id === id);
    return paymentMethod ? PM_ICONS[paymentMethod.type] : '❓';
  }

  const model = useMemo(() => {
    const bucketsByCurrency: Record<string, Bucket> = {};
    const bucketFor = (currency: string) => (bucketsByCurrency[currency] ??= emptyBucket());

    incomes.forEach((income) => (bucketFor(income.moneda).income += income.monto));

    // Cada gasto se clasifica por su propio `tipo` (snapshot congelado al pagar),
    // sin mirar la obligación viva → editar una obligación no reclasifica pagos.
    expenses.forEach((expense) => {
      const bucket = bucketFor(expense.moneda);
      if (expense.tipo === 'inversion') bucket.investment += expense.monto;
      else if (expense.tipo === 'fijo') bucket.fixed += expense.monto;
      else bucket.variable += expense.monto;
    });

    // Pendiente por pagar = saldo (monto − ya pagado) de las obligaciones del mes.
    obligations.forEach((obligation) => {
      const paid = paidByObligation[obligation.id] ?? 0;
      const remaining = Math.max(0, obligation.monto - paid);
      if (remaining <= 0) return;
      const bucket = bucketFor(obligation.moneda);
      if (obligation.tipo === 'inversion') bucket.pendingInvestment += remaining;
      else bucket.pendingExpense += remaining;
    });

    const baseBucket = bucketsByCurrency[baseCurrency] ?? emptyBucket();
    const totalIncome = baseBucket.income;
    const totalExpense = baseBucket.fixed + baseBucket.variable;
    const investment = baseBucket.investment;
    const available = totalIncome - totalExpense;
    const savings = available - investment;
    const pendingTotal = baseBucket.pendingExpense + baseBucket.pendingInvestment;
    const spentPct =
      totalIncome > 0 ? Math.min(((totalExpense + investment) / totalIncome) * 100, 100) : 0;

    // KPIs financieros.
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
    const outflow = totalExpense + investment;
    const fixedRate = outflow > 0 ? (baseBucket.fixed / outflow) * 100 : 0;

    const currencies = Object.keys(bucketsByCurrency).sort((a, b) =>
      a === baseCurrency ? -1 : b === baseCurrency ? 1 : 0,
    );

    // Uso por medio de pago: gastos reales de la moneda base (incluye pagos de
    // obligación, que también salen por un medio de pago).
    const statsByPaymentMethod: Record<string, PaymentMethodStat> = {};
    expenses
      .filter((expense) => expense.moneda === baseCurrency)
      .forEach((expense) => {
        const key = expense.paymentMethodId || 'unassigned';
        if (!statsByPaymentMethod[key]) {
          statsByPaymentMethod[key] = {
            name: expense.paymentMethodId ? paymentMethodName(expense.paymentMethodId) : 'Sin asignar',
            icon: expense.paymentMethodId ? paymentMethodIcon(expense.paymentMethodId) : '❓',
            total: 0,
            count: 0,
            categories: {},
          };
        }
        const category = expense.cat || 'Otro';
        const stat = statsByPaymentMethod[key];
        stat.total += expense.monto;
        stat.count++;
        stat.categories[category] = (stat.categories[category] || 0) + expense.monto;
      });
    const paymentMethodUsage = Object.values(statsByPaymentMethod).sort((a, b) => b.total - a.total);
    const paymentMethodMax = paymentMethodUsage.length ? paymentMethodUsage[0].total : 1;

    // Ingresos por categoría (moneda base).
    const incomeByCategory: Record<string, number> = {};
    incomes
      .filter((income) => income.moneda === baseCurrency)
      .forEach((income) => {
        const category = income.cat;
        incomeByCategory[category] = (incomeByCategory[category] || 0) + income.monto;
      });

    // Inversiones reales del mes = gastos snapshot 'inversion' (moneda base).
    const investmentItems = expenses.filter(
      (expense) => expense.moneda === baseCurrency && expense.tipo === 'inversion',
    );
    // Pendientes: obligaciones base con saldo por pagar, con su saldo.
    const pendingItems = obligations
      .filter((obligation) => obligation.moneda === baseCurrency)
      .map((obligation) => ({
        obligation,
        remaining: Math.max(0, obligation.monto - (paidByObligation[obligation.id] ?? 0)),
      }))
      .filter((item) => item.remaining > 0);

    return {
      bucketsByCurrency,
      currencies,
      totalIncome,
      totalExpense,
      investment,
      available,
      savings,
      pendingTotal,
      spentPct,
      savingsRate,
      fixedRate,
      baseBucket,
      paymentMethodUsage,
      paymentMethodMax,
      incomeByCategory,
      investmentItems,
      pendingItems,
    };
  }, [obligations, expenses, incomes, paidByObligation, baseCurrency]);

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      <AppHeader title="Resumen" />
      <ScrollView contentContainerClassName="p-4 pb-8">
        {/* Indicadores clave */}
        <SectionTitle text="Indicadores" />
        <View className="mb-3 flex-row gap-3">
          <Kpi
            label="Tasa de ahorro"
            value={`${model.savingsRate.toFixed(0)}%`}
            color={model.savingsRate >= 0 ? '#16a34a' : '#dc2626'}
          />
          <Kpi label="Gasto fijo" value={`${model.fixedRate.toFixed(0)}%`} color="#2563eb" />
          <Kpi
            label="Pendiente"
            value={fmt(model.pendingTotal, baseCurrency)}
            color={model.pendingTotal > 0 ? '#f59e0b' : '#16a34a'}
          />
        </View>

        {/* Balance por moneda */}
        {model.currencies.length > 1 && (
          <>
            <SectionTitle text="Balance por moneda" />
            {model.currencies.map((currency) => {
              const bucket = model.bucketsByCurrency[currency];
              const symbol = currencySymbol(currency);
              const outflow = bucket.fixed + bucket.variable;
              const available = bucket.income - outflow;
              const savings = available - bucket.investment;
              return (
                <Card key={currency} accent="#2563eb">
                  <Text className="mb-2 text-xs font-bold uppercase text-slate-400">
                    {currency} · {symbol}
                  </Text>
                  <Row l="Ingresos" v={`${symbol} ${bucket.income.toFixed(2)}`} c="#16a34a" />
                  <Row l="Gastos fijos" v={`- ${symbol} ${bucket.fixed.toFixed(2)}`} c="#dc2626" />
                  <Row l="Gastos variables" v={`- ${symbol} ${bucket.variable.toFixed(2)}`} c="#dc2626" />
                  <Row l="Disponible" v={`${symbol} ${available.toFixed(2)}`} c={available >= 0 ? '#16a34a' : '#dc2626'} bold />
                  <Row l="Inversiones" v={`- ${symbol} ${bucket.investment.toFixed(2)}`} c="#7c3aed" />
                  <Row l="Ahorro libre" v={`${symbol} ${savings.toFixed(2)}`} c={savings >= 0 ? '#16a34a' : '#dc2626'} bold />
                </Card>
              );
            })}
          </>
        )}

        {/* Uso por medio de pago */}
        {model.paymentMethodUsage.length > 0 && (
          <>
            <SectionTitle text="Uso por medio de pago" />
            <Card>
              <Text className="mb-3 text-xs font-bold uppercase text-slate-400">
                Qué medio usas más
              </Text>
              {model.paymentMethodUsage.map((usage, index) => {
                const pct = model.paymentMethodMax > 0 ? (usage.total / model.paymentMethodMax) * 100 : 0;
                const topCategories = Object.keys(usage.categories)
                  .sort((a, b) => usage.categories[b] - usage.categories[a])
                  .slice(0, 3);
                return (
                  <View key={index} className="mb-3">
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {usage.icon} {usage.name}
                      </Text>
                      <Text className="text-sm font-bold text-[#dc2626]">{fmt(usage.total, baseCurrency)}</Text>
                    </View>
                    <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <View
                        className="h-1.5 rounded-full bg-[#2563eb]"
                        style={{ width: barWidth(pct) }}
                      />
                    </View>
                    <Text className="mt-1 text-[11px] text-slate-400">
                      {topCategories.join(' · ')} · {usage.count} items
                    </Text>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Detalle */}
        <SectionTitle text={`Detalle · ${currencySymbol(baseCurrency)}`} />

        <Card>
          <CardHeader title="Ingresos" total={fmt(model.totalIncome, baseCurrency)} totalColor="#16a34a" />
          {Object.keys(model.incomeByCategory).length ? (
            Object.keys(model.incomeByCategory)
              .sort((a, b) => model.incomeByCategory[b] - model.incomeByCategory[a])
              .map((category) => (
                <Row key={category} l={category} v={fmt(model.incomeByCategory[category], baseCurrency)} c="#16a34a" />
              ))
          ) : (
            <Text className="text-sm text-slate-400">Registra tus ingresos</Text>
          )}
        </Card>

        <Card>
          <CardHeader title="Egresos" total={fmt(model.totalExpense, baseCurrency)} totalColor="#dc2626" />
          <Row l="Gastos fijos" v={fmt(model.baseBucket.fixed, baseCurrency)} c="#dc2626" />
          <Row l="Gastos variables" v={fmt(model.baseBucket.variable, baseCurrency)} c="#dc2626" />
        </Card>

        <Card>
          <CardHeader title="Inversiones" total={fmt(model.investment, baseCurrency)} totalColor="#7c3aed" />
          {model.investmentItems.length ? (
            model.investmentItems.map((expense) => (
              <Row key={expense.id} l={expense.descripcion} v={fmt(expense.monto, baseCurrency)} c="#7c3aed" />
            ))
          ) : (
            <Text className="text-sm text-slate-400">Aún no registras inversiones este mes</Text>
          )}
        </Card>

        {model.pendingItems.length > 0 && (
          <Card accent="#f59e0b">
            <CardHeader title="Pendiente por pagar" total={fmt(model.pendingTotal, baseCurrency)} totalColor="#f59e0b" />
            {model.pendingItems.map(({ obligation, remaining }) => (
              <Row
                key={obligation.id}
                l={`${obligation.nombre}${obligation.tipo === 'inversion' ? ' · Inv.' : ''}`}
                v={fmt(remaining, baseCurrency)}
                c="#f59e0b"
              />
            ))}
            <Text className="mt-1 text-[11px] text-slate-400">
              Saldo de obligaciones vigentes de {label} sin terminar de pagar.
            </Text>
          </Card>
        )}

        {/* Balance general */}
        <View className="mt-2 rounded-2xl p-4" style={{ backgroundColor: '#1d4ed8' }}>
          <Text className="mb-2 text-xs font-bold uppercase text-white/80">
            Balance General · {label}
          </Text>
          <BRow l="Ingresos" v={fmt(model.totalIncome, baseCurrency)} />
          <BRow l="Egresos" v={`- ${fmt(model.totalExpense, baseCurrency)}`} />
          <BRow l="Disponible" v={fmt(model.available, baseCurrency)} strong vColor={model.available >= 0 ? '#fff' : '#fca5a5'} />
          <BRow l="Inversiones" v={`- ${fmt(model.investment, baseCurrency)}`} />
          <BRow l="Ahorro libre" v={fmt(model.savings, baseCurrency)} strong vColor={model.savings >= 0 ? '#86efac' : '#fca5a5'} />
          {model.pendingTotal > 0 && (
            <BRow l="Pendiente por pagar" v={fmt(model.pendingTotal, baseCurrency)} vColor="#fcd34d" />
          )}
          <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
            <View className="h-1.5 rounded-full bg-white/90" style={{ width: barWidth(model.spentPct) }} />
          </View>
          <Text className="mt-1 text-[11px] text-white/60">
            {model.spentPct.toFixed(0)}% del ingreso gastado/invertido
          </Text>
        </View>

        <Text className="mt-4 text-center text-[11px] text-slate-400">
          © 2026 IAAS Gestion Integral de Proyectos S.A.C.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <Text className="mb-2 mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{text}</Text>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-white p-3 dark:bg-slate-800">
      <Text className="text-lg font-extrabold" style={{ color }} numberOfLines={1}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[11px] text-slate-400">{label}</Text>
    </View>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <View
      className="mb-3 rounded-2xl bg-white p-4 dark:bg-slate-800"
      style={accent ? { borderLeftWidth: 4, borderLeftColor: accent } : undefined}
    >
      {children}
    </View>
  );
}

function CardHeader({ title, total, totalColor }: { title: string; total: string; totalColor: string }) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-xs font-bold uppercase text-slate-400">{title}</Text>
      <Text className="text-base font-extrabold" style={{ color: totalColor }}>
        {total}
      </Text>
    </View>
  );
}

function Row({ l, v, c, bold }: { l: string; v: string; c?: string; bold?: boolean }) {
  return (
    <View className="flex-row items-center justify-between border-b border-slate-100 py-1.5 dark:border-slate-700">
      <Text className={`text-sm ${bold ? 'font-bold' : ''} text-slate-600 dark:text-slate-300`}>{l}</Text>
      <Text className="text-sm font-bold" style={c ? { color: c } : undefined}>
        {v}
      </Text>
    </View>
  );
}

function BRow({ l, v, strong, vColor }: { l: string; v: string; strong?: boolean; vColor?: string }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className={`text-sm ${strong ? 'font-bold text-white' : 'text-white/80'}`}>{l}</Text>
      <Text className="text-sm font-bold" style={{ color: vColor ?? '#fff' }}>
        {v}
      </Text>
    </View>
  );
}
