import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { RevenueDataPoint } from '@/types';

const COLORS = ['#C8371A', '#F5A623', '#2D7A4F', '#1A6CB0', '#9B59B6'];

interface Props {
  data: RevenueDataPoint[];
  days: number;
  onChangeDays: (d: number) => void;
}

export default function RevenueChart({ data, days, onChangeDays }: Props) {
  const branchIds = [...new Set(data.map(d => d.branchId))];
  const dates = [...new Set(data.map(d => d.date))].sort();

  const chartData = dates.map(date => {
    const row: Record<string, string | number> = { date: date.slice(5) };
    branchIds.forEach(bid => {
      const point = data.find(d => d.date === date && d.branchId === bid);
      row[bid] = point ? point.revenue / 100 : 0;
    });
    return row;
  });

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-secondary">Omzet</h3>
        <div className="flex gap-1">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => onChangeDays(d)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${days === d ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
          <Tooltip formatter={(v) => `€ ${(v as number).toFixed(2)}`} />
          <Legend />
          {branchIds.map((bid, i) => (
            <Line key={bid} type="monotone" dataKey={bid} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} name={bid.slice(0, 8)} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
