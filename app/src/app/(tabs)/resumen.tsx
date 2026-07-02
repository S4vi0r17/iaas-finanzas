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

type Bucket = { ing: number; gfG: number; gfI: number; gV: number };
type PmStat = { name: string; icon: string; total: number; count: number; cats: Record<string, number> };

export default function ResumenScreen() {
  const { user } = useAuth();
  const { monthKey, label } = useMonth();
  const { data: oblData } = useObligations(monthKey);
  const { data: expData } = useExpenses(monthKey);
  const { data: incData } = useIncomes(monthKey);
  const { data: pmData } = usePaymentMethods();

  const base = user?.currency ?? 'PEN';
  const obligations = oblData?.obligations ?? [];
  const expenses = expData?.expenses ?? [];
  const incomes = incData?.incomes ?? [];

  function pmName(id: string) {
    return pmData?.paymentMethods.find((p) => p.id === id)?.name ?? id;
  }
  function pmIcon(id: string) {
    const pm = pmData?.paymentMethods.find((p) => p.id === id);
    return pm ? PM_ICONS[pm.type] : '❓';
  }

  const model = useMemo(() => {
    // Agregación por moneda
    const byC: Record<string, Bucket> = {};
    const add = (cur: string, key: keyof Bucket, amt: number) => {
      if (!byC[cur]) byC[cur] = { ing: 0, gfG: 0, gfI: 0, gV: 0 };
      byC[cur][key] += amt;
    };
    incomes.forEach((i) => add(i.moneda, 'ing', i.monto));
    obligations.forEach((o) => add(o.moneda, o.tipo === 'inversion' ? 'gfI' : 'gfG', o.monto));
    expenses.forEach((g) => add(g.moneda, 'gV', g.monto));

    const b = byC[base] ?? { ing: 0, gfG: 0, gfI: 0, gV: 0 };
    const ingT = b.ing;
    const totE = b.gfG + b.gV;
    const totI = b.gfI;
    const disp = ingT - totE;
    const ahorro = ingT - totE - totI;
    const pct = ingT > 0 ? Math.min(((totE + totI) / ingT) * 100, 100) : 0;

    // Orden de monedas (base primero)
    const currencies = Object.keys(byC).sort((a, x) => (a === base ? -1 : x === base ? 1 : 0));

    // Uso por medio de pago (solo moneda base)
    const pmStats: Record<string, PmStat> = {};
    const addPm = (id: string | null, amt: number, cat: string) => {
      const k = id || 'xx';
      if (!pmStats[k]) {
        pmStats[k] = {
          name: id ? pmName(id) : 'Sin asignar',
          icon: id ? pmIcon(id) : '❓',
          total: 0,
          count: 0,
          cats: {},
        };
      }
      pmStats[k].total += amt;
      pmStats[k].count++;
      pmStats[k].cats[cat] = (pmStats[k].cats[cat] || 0) + amt;
    };
    obligations
      .filter((o) => o.moneda === base)
      .forEach((o) => addPm(o.paymentMethodId, o.monto, o.catCustom?.trim() || o.cat || 'Otro'));
    expenses
      .filter((g) => g.moneda === base)
      .forEach((g) => addPm(g.paymentMethodId, g.monto, g.catCustom?.trim() || g.cat || 'Otro'));
    const pmList = Object.values(pmStats).sort((a, x) => x.total - a.total);
    const pmMax = pmList.length ? pmList[0].total : 1;

    // Ingresos por categoría (base)
    const incByCat: Record<string, number> = {};
    incomes
      .filter((i) => i.moneda === base)
      .forEach((i) => {
        const c = i.catCustom?.trim() || i.cat;
        incByCat[c] = (incByCat[c] || 0) + i.monto;
      });

    const invList = obligations.filter((o) => o.tipo === 'inversion' && o.moneda === base);

    return {
      byC,
      currencies,
      ingT,
      totE,
      totI,
      disp,
      ahorro,
      pct,
      base_: b,
      pmList,
      pmMax,
      incByCat,
      invList,
    };
  }, [obligations, expenses, incomes, base]);

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      <AppHeader title="Resumen" />
      <ScrollView contentContainerClassName="p-4 pb-8">
        {/* Balance por moneda */}
        {model.currencies.length > 1 && (
          <>
            <SectionTitle text="Balance por moneda" />
            {model.currencies.map((cur) => {
              const d = model.byC[cur];
              const sym = currencySymbol(cur);
              const totEC = d.gfG + d.gV;
              const dispC = d.ing - totEC;
              const ahorC = d.ing - totEC - d.gfI;
              return (
                <Card key={cur} accent="#2563eb">
                  <Text className="mb-2 text-xs font-bold uppercase text-slate-400">
                    {cur} · {sym}
                  </Text>
                  <Row l="Ingresos" v={`${sym} ${d.ing.toFixed(2)}`} c="#16a34a" />
                  <Row l="Egresos fijos" v={`- ${sym} ${d.gfG.toFixed(2)}`} c="#dc2626" />
                  <Row l="Gastos variables" v={`- ${sym} ${d.gV.toFixed(2)}`} c="#dc2626" />
                  <Row l="Disponible" v={`${sym} ${dispC.toFixed(2)}`} c={dispC >= 0 ? '#16a34a' : '#dc2626'} bold />
                  <Row l="Inversiones" v={`- ${sym} ${d.gfI.toFixed(2)}`} c="#7c3aed" />
                  <Row l="Ahorro libre" v={`${sym} ${ahorC.toFixed(2)}`} c={ahorC >= 0 ? '#16a34a' : '#dc2626'} bold />
                </Card>
              );
            })}
          </>
        )}

        {/* Uso por medio de pago */}
        {model.pmList.length > 0 && (
          <>
            <SectionTitle text="Uso por medio de pago" />
            <Card>
              <Text className="mb-3 text-xs font-bold uppercase text-slate-400">
                Qué medio usas más
              </Text>
              {model.pmList.map((pm, i) => {
                const pct = model.pmMax > 0 ? (pm.total / model.pmMax) * 100 : 0;
                const topCats = Object.keys(pm.cats)
                  .sort((a, b) => pm.cats[b] - pm.cats[a])
                  .slice(0, 3);
                return (
                  <View key={i} className="mb-3">
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {pm.icon} {pm.name}
                      </Text>
                      <Text className="text-sm font-bold text-[#dc2626]">{fmt(pm.total, base)}</Text>
                    </View>
                    <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <View
                        className="h-1.5 rounded-full bg-[#2563eb]"
                        style={{ width: barWidth(pct) }}
                      />
                    </View>
                    <Text className="mt-1 text-[11px] text-slate-400">
                      {topCats.join(' · ')} · {pm.count} items
                    </Text>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Detalle */}
        <SectionTitle text={`Detalle · ${currencySymbol(base)}`} />

        <Card>
          <CardHeader title="Ingresos" total={fmt(model.ingT, base)} totalColor="#16a34a" />
          {Object.keys(model.incByCat).length ? (
            Object.keys(model.incByCat)
              .sort((a, b) => model.incByCat[b] - model.incByCat[a])
              .map((c) => <Row key={c} l={c} v={fmt(model.incByCat[c], base)} c="#16a34a" />)
          ) : (
            <Text className="text-sm text-slate-400">Registra tus ingresos</Text>
          )}
        </Card>

        <Card>
          <CardHeader title="Egresos" total={fmt(model.totE, base)} totalColor="#dc2626" />
          <Row l="Gastos fijos" v={fmt(model.base_.gfG, base)} c="#dc2626" />
          <Row l="Gastos variables" v={fmt(model.base_.gV, base)} c="#dc2626" />
        </Card>

        <Card>
          <CardHeader title="Inversiones" total={fmt(model.totI, base)} totalColor="#7c3aed" />
          {model.invList.length ? (
            model.invList.map((o) => <Row key={o.id} l={o.nombre} v={fmt(o.monto, base)} c="#7c3aed" />)
          ) : (
            <Text className="text-sm text-slate-400">Marca obligaciones como Inversión</Text>
          )}
        </Card>

        {/* Balance general */}
        <View className="mt-2 rounded-2xl p-4" style={{ backgroundColor: '#1d4ed8' }}>
          <Text className="mb-2 text-xs font-bold uppercase text-white/80">
            Balance General · {label}
          </Text>
          <BRow l="Ingresos" v={fmt(model.ingT, base)} />
          <BRow l="Egresos" v={`- ${fmt(model.totE, base)}`} />
          <BRow l="Disponible" v={fmt(model.disp, base)} strong vColor={model.disp >= 0 ? '#fff' : '#fca5a5'} />
          <BRow l="Inversiones" v={`- ${fmt(model.totI, base)}`} />
          <BRow l="Ahorro libre" v={fmt(model.ahorro, base)} strong vColor={model.ahorro >= 0 ? '#86efac' : '#fca5a5'} />
          <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
            <View className="h-1.5 rounded-full bg-white/90" style={{ width: barWidth(model.pct) }} />
          </View>
          <Text className="mt-1 text-[11px] text-white/60">
            {model.pct.toFixed(0)}% del ingreso comprometido
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
