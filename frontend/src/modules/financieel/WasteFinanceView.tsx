import { useEffect, useState } from 'react';
import { getWasteFinance } from '@/api/finance';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import KpiCard from '@/components/KpiCard';
import Spinner from '@/components/Spinner';

interface WasteData { period: string; from: string; wasteCost: number; revenue: number; wastePercent: number | null }

interface Props { branchId: string | null }

export default function WasteFinanceView({ branchId }: Props) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [data, setData] = useState<WasteData | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatEur } = useCurrencyFormat();

  useEffect(() => {
    setLoading(true);
    getWasteFinance(period, branchId ?? undefined)
      .then(d => setData(d as WasteData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period, branchId]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['day', 'week', 'month'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-sm rounded-full transition-colors ${period === p ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {p === 'day' ? 'Vandaag' : p === 'week' ? 'Week' : 'Maand'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : data ? (
        <>
          {data.wastePercent !== null && data.wastePercent > 5 && (
            <div className="bg-danger/10 text-danger rounded-lg p-3 text-sm font-medium">
              ⚠️ Afvalpercentage ({data.wastePercent}%) overschrijdt de 5% drempel!
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <KpiCard label="Afvalkosten" value={formatEur(data.wasteCost)} color={data.wastePercent != null && data.wastePercent > 5 ? 'danger' : 'success'} />
            <KpiCard label="% van omzet" value={data.wastePercent != null ? `${data.wastePercent}%` : '—'} color={data.wastePercent != null && data.wastePercent > 5 ? 'danger' : 'success'} subtext="Doel: < 5%" />
          </div>
        </>
      ) : null}
    </div>
  );
}
