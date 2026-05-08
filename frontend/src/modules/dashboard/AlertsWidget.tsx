import { Link } from 'react-router-dom';
import AlertBadge from '@/components/AlertBadge';
import type { AlertsData } from '@/types';

interface Props { alerts: AlertsData }

export default function AlertsWidget({ alerts }: Props) {
  const rows = [
    { label: 'Verlofaanvragen (pending)', count: alerts.pendingLeaveRequests, to: '/rooster', color: 'warning' as const },
    { label: 'Lage voorraad', count: alerts.lowStockItems, to: '/rooster', color: 'danger' as const },
    { label: `Waste-anomalieën (${alerts.wastePercent}% van omzet)`, count: alerts.wasteAnomalies, to: '/waste', color: 'danger' as const },
  ];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold text-secondary mb-3">Meldingen</h3>
      <div className="space-y-2">
        {rows.map(r => (
          <Link key={r.label} to={r.to} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-sm text-gray-600">{r.label}</span>
            <AlertBadge count={r.count} color={r.color} />
          </Link>
        ))}
      </div>
    </div>
  );
}
