import { useState } from 'react';
import { logWaste } from '@/api/waste';

interface Props { branchId: string | null; onSaved: () => void }

const REASONS: { label: string; value: 'expired' | 'dropped' | 'overproduced' | 'quality_fail' | 'other' }[] = [
  { label: 'Verlopen', value: 'expired' },
  { label: 'Gevallen/beschadigd', value: 'dropped' },
  { label: 'Overproductie', value: 'overproduced' },
  { label: 'Kwaliteitsfout', value: 'quality_fail' },
  { label: 'Anders', value: 'other' },
];
const UNITS = ['kg', 'stuks', 'liter', 'porties'];

export default function WasteEntryForm({ branchId, onSaved }: Props) {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [reason, setReason] = useState<typeof REASONS[number]['value']>('expired');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName || !quantity || !branchId) return;
    setSaving(true);
    setError('');
    try {
      await logWaste({ branchId, itemName, quantity: parseFloat(quantity), unit, reason, date });
      setItemName(''); setQuantity('');
      onSaved();
    } catch {
      setError('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold text-secondary">Afval registreren</h3>
      {!branchId && <p className="text-warning text-sm">Selecteer eerst een vestiging.</p>}
      {error && <p className="text-danger text-sm">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Artikel</label>
          <input value={itemName} onChange={e => setItemName(e.target.value)} required placeholder="bijv. Tomaten" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hoeveelheid</label>
          <input type="number" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Eenheid</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Reden</label>
          <select value={reason} onChange={e => setReason(e.target.value as typeof reason)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Datum</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>
      <button type="submit" disabled={saving || !itemName || !quantity || !branchId} className="w-full py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
        {saving ? 'Opslaan…' : 'Registreer afval'}
      </button>
    </form>
  );
}
