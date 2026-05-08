import { useState } from 'react';
import { clockIn, clockOut } from '@/api/hr';

export default function ClockInOut() {
  const [clockedIn, setClockedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    try {
      if (clockedIn) { await clockOut(); setClockedIn(false); }
      else { await clockIn(); setClockedIn(true); }
    } catch {
      setError('Actie mislukt — probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm text-center">
      <h3 className="font-semibold text-secondary mb-4">Aanwezigheid</h3>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`w-full py-4 rounded-xl font-bold text-lg text-white touch-min transition-colors disabled:opacity-50
          ${clockedIn ? 'bg-danger hover:bg-danger/90' : 'bg-success hover:bg-success/90'}`}
      >
        {loading ? 'Bezig...' : clockedIn ? '🔴 Uitklokken' : '🟢 Inklokken'}
      </button>
    </div>
  );
}
