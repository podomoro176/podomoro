import { useState } from 'react';
import Modal from './Modal';
import { processPayment } from '@/api/pos';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import type { Order } from '@/types';

interface Props {
  open: boolean;
  order: Order;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

export default function PaymentModal({ open, order, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<'pin' | 'cash'>('pin');
  const [cashGiven, setCashGiven] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formatEur } = useCurrencyFormat();

  const cashGivenCents = Math.round(parseFloat(cashGiven || '0') * 100);
  const change = cashGivenCents - order.totalAmount;

  async function handlePay() {
    if (tab === 'cash' && cashGivenCents < order.totalAmount) return;
    setLoading(true);
    setError(null);
    try {
      const result = await processPayment(order.id, {
        paymentMethod: tab,
        ...(tab === 'cash' ? { cashGiven: cashGivenCents } : {}),
      });
      onSuccess(result.order);
    } catch {
      setError('Betaling mislukt — probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-bold text-secondary">Betaling</h2>
        <p className="text-2xl font-bold text-primary mt-1">{formatEur(order.totalAmount)}</p>
      </div>

      <div className="px-6 py-4">
        <div className="flex gap-2 mb-4">
          {(['pin', 'cash'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${tab === t ? 'bg-primary text-white' : 'bg-gray-100 text-secondary hover:bg-gray-200'}`}
            >
              {t === 'pin' ? 'Pin' : 'Contant'}
            </button>
          ))}
        </div>

        {tab === 'cash' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary mb-1">Ontvangen bedrag (€)</label>
            <input
              type="number"
              value={cashGiven}
              onChange={e => setCashGiven(e.target.value)}
              placeholder="0.00"
              step="0.05"
              className="w-full border rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {cashGivenCents >= order.totalAmount && (
              <p className="mt-2 text-success font-semibold">
                Wisselgeld: {formatEur(change)}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-danger text-sm mb-3">{error}</p>}

        <button
          onClick={handlePay}
          disabled={loading || (tab === 'cash' && cashGivenCents < order.totalAmount)}
          className="w-full py-3 rounded-lg bg-success text-white font-semibold touch-min disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {loading ? 'Verwerken...' : 'Bevestig betaling'}
        </button>
      </div>
    </Modal>
  );
}
