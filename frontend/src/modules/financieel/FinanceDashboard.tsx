import { useEffect, useState } from 'react';
import { getFinanceDashboard } from '@/api/finance';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import KpiCard from '@/components/KpiCard';
import Spinner from '@/components/Spinner';

interface FinanceKpis {
  revenueToday: number;
  revenueSameDayLastWeek: number;
  revenueChangePercent: number | null;
  wasteCostToday: number;
  foodCostPercent: number | null;
}

interface Props { branchId: string | null }

export default function FinanceDashboard({ branchId }: Props) {
  const [kpis, setKpis] = useState<FinanceKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatEur } = useCurrencyFormat();

  useEffect(() => {
    setLoading(true);
    getFinanceDashboard(branchId ?? undefined)
      .then(d => setKpis(d as FinanceKpis))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId]);

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (!kpis) return null;

  const foodColor = kpis.foodCostPercent == null ? 'primary'
    : kpis.foodCostPercent <= 32 ? 'success'
    : kpis.foodCostPercent <= 36 ? 'warning' : 'danger';

  const changeText = kpis.revenueChangePercent == null ? '' : `${kpis.revenueChangePercent >= 0 ? '+' : ''}${kpis.revenueChangePercent}% vs vorige week`;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Omzet vandaag" value={formatEur(kpis.revenueToday)} subtext={changeText} color="primary" />
      <KpiCard label="Omzet zelfde dag vorige week" value={formatEur(kpis.revenueSameDayLastWeek)} color="primary" />
      <KpiCard label="Foodkost % (doel 28–32%)" value={kpis.foodCostPercent != null ? `${kpis.foodCostPercent}%` : '—'} color={foodColor} />
      <KpiCard label="Afvalkosten vandaag" value={formatEur(kpis.wasteCostToday)} color={kpis.wasteCostToday > 5000 ? 'warning' : 'success'} />
    </div>
  );
}
