import { useState, FormEvent } from 'react';
import { submitLeave } from '@/api/hr';

const TYPES = [
  { value: 'vakantie', label: 'Vakantie' },
  { value: 'ziek', label: 'Ziekmelding' },
  { value: 'bijzonder_verlof', label: 'Bijzonder verlof' },
];

interface Props { onSuccess: () => void }

export default function LeaveRequestForm({ onSuccess }: Props) {
  const [type, setType] = useState('vakantie');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submitLeave({ type, startDate, endDate, reason: reason || undefined });
      setStartDate(''); setEndDate(''); setReason('');
      onSuccess();
    } catch {
      setError('Aanvraag mislukt — probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm space-y-4">
      <h3 className="font-semibold text-secondary">Verlofaanvraag indienen</h3>

      <div>
        <label className="block text-sm font-medium text-secondary mb-1">Type verlof</label>
        <select value={type} onChange={e => setType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Van</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Tot en met</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary mb-1">Reden (optioneel)</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg touch-min disabled:opacity-50 hover:bg-primary/90 transition-colors">
        {loading ? 'Indienen...' : 'Verlof aanvragen'}
      </button>
    </form>
  );
}
