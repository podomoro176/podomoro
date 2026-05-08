import { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { checkout } from '@/api/online';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import StripeCheckoutForm from './StripeCheckoutForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

export default function CheckoutPage() {
  const { items, clear: clearCart } = useCart();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isTakeaway, setIsTakeaway] = useState(true);
  const [notes, setNotes] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const branchId = items[0]?.menuItem.branchId ?? '';

  async function handleCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length || !branchId) return;
    setLoading(true);
    setError('');
    try {
      const cartItems = items.map(ci => ({ menuItemId: ci.menuItem.id, quantity: ci.quantity }));
      const result = await checkout({ branchId, customerEmail: email, customerName: name, isTakeaway, items: cartItems, notes: notes || undefined });
      setClientSecret(result.clientSecret);
      setOrderId(result.orderId);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Er ging iets mis. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  }

  function handlePaymentSuccess(oid: string) {
    clearCart();
    navigate(`/bestel/status/${oid}`);
  }

  return (
    <div className="min-h-screen bg-bg flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <a href="/bestel" className="text-sm text-gray-500 hover:text-primary">← Terug naar menu</a>
        <h1 className="text-2xl font-bold text-secondary">Afrekenen</h1>

        {items.length === 0 && (
          <div className="bg-warning/10 text-warning rounded-xl p-4 text-sm">Je winkelwagen is leeg.</div>
        )}

        {!clientSecret ? (
          <form onSubmit={handleCustomerSubmit} className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold">Jouw gegevens</h2>
            {error && <p className="text-danger text-sm">{error}</p>}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Naam *</label>
              <input value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bestelling</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" checked={isTakeaway} onChange={() => setIsTakeaway(true)} /> Meenemen
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" checked={!isTakeaway} onChange={() => setIsTakeaway(false)} /> Ter plaatse
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Opmerkingen</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <button type="submit" disabled={loading || !items.length} className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 min-h-[44px]">
              {loading ? 'Laden…' : 'Doorgaan naar betaling'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold">Betalen</h2>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripeCheckoutForm orderId={orderId} onSuccess={handlePaymentSuccess} />
            </Elements>
          </div>
        )}
      </div>
    </div>
  );
}
