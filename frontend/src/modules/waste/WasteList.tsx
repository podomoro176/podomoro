import { useEffect, useState } from 'react';
import { listWaste, updateWasteCost } from '@/api/waste';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import Spinner from '@/components/Spinner';
import type { WasteEntry } from '@/types';

const REASON_LABELS: Record<string, string> = {
  expired: 'Verlopen', dropped: 'Gevallen', overproduced: 'Overproductie',
  quality_fail: 'Kwaliteitsfout', other: 'Anders',
};

interface Props { branchId: string | null; refresh: number; isManager: boolean }

export default function WasteList({ branchId, refresh, isManager }: Props) {
  const [items, setItems] = useState<WasteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState('');
  const { formatDate } = useDateFormat();
  const { formatEur } = useCurrencyFormat();

  useEffect(() => {
    setLoading(true);
    listWaste({ branchId: branchId ?? undefined, date: date || undefined })
      .then(d => setItems(d.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId, date, refresh]);

  async function saveCost(id: string) {
    const cents = Math.round(parseFloat(editCost) * 100);
    await updateWasteCost(id, cents);
    setEditingId(null);
    setItems(prev => prev.map(i => i.id === id ? { ...i, costPrice: cents } : i));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Datum</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        {date && <button onClick={() => setDate('')} className="self-end mb-0.5 text-xs text-gray-400 hover:text-gray-600">Wis filter</button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-gray-500 border-b">
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Artikel</th>
              <th className="px-4 py-3">Hoeveelheid</th>
              <th className="px-4 py-3">Reden</th>
              <th className="px-4 py-3">Kostprijs</th>
            </tr></thead>
            <tbody className="divide-y">
              {items.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3 font-medium">{entry.itemName}</td>
                  <td className="px-4 py-3">{entry.quantity} {entry.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{REASON_LABELS[entry.reason] ?? entry.reason}</td>
                  <td className="px-4 py-3">
                    {isManager && editingId === entry.id ? (
                      <div className="flex gap-1">
                        <input type="number" step="0.01" value={editCost} onChange={e => setEditCost(e.target.value)} className="border rounded px-2 py-1 text-xs w-20" />
                        <button onClick={() => saveCost(entry.id)} className="text-xs text-primary hover:underline">Opslaan</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">Annuleer</button>
                      </div>
                    ) : (
                      <span
                        className={isManager ? 'cursor-pointer hover:text-primary' : ''}
                        onClick={() => { if (isManager) { setEditingId(entry.id); setEditCost(entry.costPrice != null ? (entry.costPrice / 100).toFixed(2) : ''); } }}
                      >
                        {entry.costPrice != null ? formatEur(entry.costPrice) : <span className="text-gray-300">—</span>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Geen afval gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
