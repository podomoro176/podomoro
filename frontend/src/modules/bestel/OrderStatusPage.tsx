import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getOrderStatus } from '@/api/online';
import { useSocket } from '@/hooks/useSocket';
import type { OrderStatus } from '@/types';

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Ontvangen' },
  { key: 'accepted', label: 'Bevestigd' },
  { key: 'preparing', label: 'In bereiding' },
  { key: 'ready', label: 'Klaar voor afhaal' },
  { key: 'completed', label: 'Afgerond' },
];

export default function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [loading, setLoading] = useState(true);

  useSocket(`order:${orderId}`);

  useEffect(() => {
    if (!orderId) return;
    const poll = async () => {
      try {
        const d = await getOrderStatus(orderId);
        setStatus(d.status as OrderStatus);
      } catch { /* ignore */ }
      setLoading(false);
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [orderId]);

  const currentIndex = STEPS.findIndex(s => s.key === status);
  const isCancelled = status === 'cancelled';

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold text-secondary">Bestelstatus</h1>
        <p className="text-sm text-gray-500">Bestelling #{orderId?.slice(-8).toUpperCase()}</p>

        {loading ? (
          <div className="animate-pulse text-gray-400">Laden…</div>
        ) : isCancelled ? (
          <div className="bg-danger/10 text-danger rounded-xl p-6 font-medium">
            Bestelling geannuleerd
          </div>
        ) : (
          <div className="space-y-2">
            {STEPS.map((step, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              return (
                <div key={step.key} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${active ? 'bg-primary/10 border border-primary' : done ? 'bg-success/10' : 'bg-white border'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${active ? 'bg-primary text-white' : done ? 'bg-success text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`font-medium text-sm ${active ? 'text-primary' : done ? 'text-success' : 'text-gray-400'}`}>{step.label}</span>
                  {active && <span className="ml-auto text-xs text-primary animate-pulse">Nu</span>}
                </div>
              );
            })}
          </div>
        )}

        <a href="/bestel" className="inline-block text-sm text-gray-500 hover:text-primary">← Nieuw bestelling</a>
      </div>
    </div>
  );
}
