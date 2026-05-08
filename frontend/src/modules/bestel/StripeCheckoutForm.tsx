import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface Props { onSuccess: (orderId: string) => void; orderId: string }

export default function StripeCheckoutForm({ onSuccess, orderId }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError('');

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/bestel/status/${orderId}` },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Betaling mislukt');
      setProcessing(false);
    } else {
      onSuccess(orderId);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-danger text-sm">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
      >
        {processing ? 'Verwerken…' : 'Betaal nu'}
      </button>
    </form>
  );
}
