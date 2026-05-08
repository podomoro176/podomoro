import { useEffect, useState } from 'react';
import { getWasteTotals } from '@/api/waste';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import KpiCard from '@/components/KpiCard';
import Spinner from '@/components/Spinner';

interface Props { branchId: string | null }

export default function WasteTotalsChart({ branchId }: Props) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [data, setData] = useState<{ period: string; totalCost: number; totalEntries: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatEur } = useCurrencyFormat();

  useEffect(() => {
    setLoading(true);
    getWasteTotals(period, branchId ?? undefined)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period, branchId]);

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-secondary">Afvaltotalen</h3>
        <div className="flex gap-1">
          {(['day', 'week', 'month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs rounded-full transition-colors ${period === p ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p === 'day' ? 'Vandaag' : p === 'week' ? 'Week' : 'Maand'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Totale afvalkosten" value={formatEur(data.totalCost)} color="warning" />
          <KpiCard label="Registraties" value={String(data.totalEntries)} color="primary" />
        </div>
      ) : (
        <p className="text-center py-4 text-gray-400 text-sm">Geen data</p>
      )}
    </div>
  );
}
