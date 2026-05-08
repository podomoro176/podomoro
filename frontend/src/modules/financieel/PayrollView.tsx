import { useState } from 'react';
import { getPayroll, exportPayroll } from '@/api/finance';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import Spinner from '@/components/Spinner';

interface PayrollRow { employee: { name: string; role: string }; totalHours: number; grossPay: number }
interface PayrollData { periodStart: string; periodEnd: string; rows: PayrollRow[]; totalLabourCost: number }

interface Props { branchId: string | null }

export default function PayrollView({ branchId }: Props) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(false);
  const { formatEur } = useCurrencyFormat();

  async function load() {
    if (!start || !end) return;
    setLoading(true);
    try {
      setData((await getPayroll({ period_start: start, period_end: end, branchId: branchId ?? undefined })) as PayrollData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!start || !end) return;
    const blob = await exportPayroll({ period_start: start, period_end: end, branchId: branchId ?? undefined });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'loonstrook.pdf'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Periode van</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tot en met</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={load} disabled={!start || !end || loading} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
          Laden
        </button>
        {data && <button onClick={handleExport} className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50">↓ PDF</button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : data ? (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-gray-500 border-b">
              <th className="px-4 py-3">Naam</th><th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3 text-right">Uren</th><th className="px-4 py-3 text-right">Bruto</th>
            </tr></thead>
            <tbody className="divide-y">
              {data.rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.employee.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.employee.role}</td>
                  <td className="px-4 py-3 text-right">{r.totalHours.toFixed(2)}u</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatEur(r.grossPay)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 font-bold">
                <td className="px-4 py-3" colSpan={3}>Totaal loonkosten</td>
                <td className="px-4 py-3 text-right text-primary">{formatEur(data.totalLabourCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  );
}
