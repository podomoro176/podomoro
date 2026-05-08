import { useState } from 'react';
import { getAttendanceVariance } from '@/api/hr';
import Spinner from '@/components/Spinner';

interface VarianceRow { employee: { name: string }; scheduledHours: number; actualHours: number; variance: number }

function currentWeek(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const week = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + (jan4.getDay() || 7) - 1) / 7) + 1;
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default function AttendanceVariance() {
  const [week, setWeek] = useState(currentWeek);
  const [rows, setRows] = useState<VarianceRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = (await getAttendanceVariance(week)) as VarianceRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold text-secondary mb-4">Uren variantie</h3>
      <div className="flex gap-2 mb-4">
        <input type="week" value={week} onChange={e => setWeek(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <button onClick={load} disabled={loading} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
          Laden
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Selecteer een week en klik op Laden</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b"><th className="py-2">Naam</th><th className="py-2 text-right">Gepland</th><th className="py-2 text-right">Werkelijk</th><th className="py-2 text-right">Verschil</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((r, i) => {
              const diff = r.actualHours - r.scheduledHours;
              return (
                <tr key={i}>
                  <td className="py-2">{r.employee.name}</td>
                  <td className="py-2 text-right">{r.scheduledHours.toFixed(1)}u</td>
                  <td className="py-2 text-right">{r.actualHours.toFixed(1)}u</td>
                  <td className={`py-2 text-right font-medium ${Math.abs(diff) > 0.5 ? 'text-danger' : 'text-success'}`}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}u
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
