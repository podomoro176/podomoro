import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { getKpis, getRevenueChart, getAlerts, getRecentOrders } from '@/api/dashboard';
import { getReviews } from '@/api/reviews';
import BranchSelector from '@/components/BranchSelector';
import KpiCard from '@/components/KpiCard';
import Spinner from '@/components/Spinner';
import RevenueChart from './RevenueChart';
import AlertsWidget from './AlertsWidget';
import LiveOrderFeed from './LiveOrderFeed';
import ReviewsWidget from './ReviewsWidget';
import type { KpiData, RevenueDataPoint, AlertsData, Order, ReviewBranch } from '@/types';

export default function DashboardPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<ReviewBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatEur } = useCurrencyFormat();

  const socket = useSocket('owner:live-feed');

  useEffect(() => {
    function onOrder({ order }: { order: Order }) {
      setOrders(prev => [order, ...prev.slice(0, 9)]);
    }
    socket.on('order:new', onOrder);
    return () => { socket.off('order:new', onOrder); };
  }, [socket]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getKpis(), getRevenueChart(days), getAlerts(), getRecentOrders(), getReviews(branchId ?? undefined)])
      .then(([k, r, a, o, rv]) => {
        setKpis(k); setRevenue(r); setAlerts(a); setOrders(o); setReviews(rv);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId, days]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner size={40} /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-secondary">Dashboard</h1>
        <BranchSelector value={branchId} onChange={setBranchId} />
      </div>

      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Omzet vandaag" value={formatEur(kpis.revenueToday)} color="primary" />
          <KpiCard label="Omzet gisteren" value={formatEur(kpis.revenueYesterday)} color="primary" />
          <KpiCard label="Personeel ingeroosterd" value={kpis.staffOnShift} color="success" />
          <KpiCard label="Open bestellingen" value={kpis.openOrders} color={kpis.openOrders > 10 ? 'warning' : 'primary'} />
        </div>
      )}

      <RevenueChart data={revenue} days={days} onChangeDays={setDays} />

      <div className="grid lg:grid-cols-2 gap-4">
        {alerts && <AlertsWidget alerts={alerts} />}
        <ReviewsWidget reviews={reviews} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <LiveOrderFeed orders={orders} />
      </div>
    </div>
  );
}
