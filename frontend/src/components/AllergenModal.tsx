import { useState } from 'react';
import Modal from './Modal';
import { confirmAllergens } from '@/api/menu';
import type { AllergenName } from '@/types';

const ALLERGEN_EMOJI: Record<AllergenName, string> = {
  gluten: '🌾', schaaldieren: '🦐', eieren: '🥚', vis: '🐟', pinda: '🥜',
  soja: '🫘', melk: '🥛', noten: '🌰', selderij: '🥬', mosterd: '🌿',
  sesam: '🌱', sulfieten: '🍷', lupine: '🌼', weekdieren: '🐚',
};

interface Props {
  open: boolean;
  allergens: AllergenName[];
  orderId: string;
  menuItemId: string;
  onConfirm: () => void;
}

export default function AllergenModal({ open, allergens, orderId, menuItemId, onConfirm }: Props) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!checked || loading) return;
    setLoading(true);
    setError(null);
    try {
      await confirmAllergens({ orderId, menuItemId, allergensShown: allergens });
      setChecked(false);
      onConfirm();
    } catch {
      setError('Bevestiging mislukt — probeer opnieuw. Artikel is NIET toegevoegd.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} preventBackdropClose maxWidth="max-w-md">
      <div className="bg-primary text-white px-6 py-4 rounded-t-xl">
        <h2 className="text-lg font-bold">⚠️ Allergenen aanwezig</h2>
        <p className="text-sm opacity-90 mt-1">Informeer de klant over de volgende allergenen</p>
      </div>

      <div className="px-6 py-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {allergens.map(a => (
            <span key={a} className="flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              <span>{ALLERGEN_EMOJI[a]}</span> {a}
            </span>
          ))}
        </div>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 border-secondary/20 hover:border-primary/40 transition-colors">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded accent-primary"
          />
          <span className="text-sm font-medium text-secondary">
            Ik heb de klant geïnformeerd over de allergenen
          </span>
        </label>

        {error && (
          <p className="mt-3 text-danger text-sm bg-red-50 p-3 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!checked || loading}
          className="mt-4 w-full py-3 rounded-lg font-semibold text-white transition-all touch-min
            bg-primary hover:bg-primary/90
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Bezig...' : 'Bevestig — klant is geïnformeerd'}
        </button>
      </div>
    </Modal>
  );
}
