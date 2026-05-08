import { useEffect, useState } from 'react';
import { getReviews, createReview } from '@/api/reviews';
import BranchSelector from '@/components/BranchSelector';
import Spinner from '@/components/Spinner';
import type { ReviewBranch } from '@/types';

export default function ReviewsPage() {
  const [scores, setScores] = useState<ReviewBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);

  const [formScore, setFormScore] = useState('');
  const [formBranch, setFormBranch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function reload(bid: string | null) {
    setLoading(true);
    getReviews(bid ?? undefined)
      .then(d => setScores(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { reload(branchId); }, [branchId]);

  function colorClass(color: string | null) {
    if (color === 'green') return 'text-success bg-success/10';
    if (color === 'amber') return 'text-warning bg-warning/10';
    if (color === 'red') return 'text-danger bg-danger/10';
    return 'text-gray-500 bg-gray-100';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formBranch || !formScore) return;
    setSaving(true);
    setSaved(false);
    try {
      await createReview({ branchId: formBranch, score: parseFloat(formScore) });
      setSaved(true);
      setFormScore('');
      reload(branchId);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-secondary">Reviews</h1>
        <BranchSelector value={branchId} onChange={setBranchId} />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scores.map(branch => (
            <div key={branch.branch.id} className="bg-white rounded-xl border p-4 space-y-3">
              <p className="font-semibold text-secondary">{branch.branch.name}</p>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${colorClass(branch.color)}`}>
                ★ {branch.currentScore != null ? branch.currentScore.toFixed(1) : '—'}
              </div>
              <p className="text-xs text-gray-500">
                {branch.currentReviewCount != null ? `${branch.currentReviewCount} review${branch.currentReviewCount !== 1 ? 's' : ''}` : 'Geen data'}
              </p>
              {branch.history.length > 1 && (
                <div className="flex items-end gap-0.5 h-8">
                  {branch.history.slice(-12).map((r, i) => {
                    const h = Math.round((r.score / 5) * 32);
                    const c = r.score >= 4 ? 'bg-success' : r.score >= 3 ? 'bg-warning' : 'bg-danger';
                    return <div key={i} className={`flex-1 rounded-sm ${c}`} style={{ height: h }} title={r.score.toFixed(1)} />;
                  })}
                </div>
              )}
            </div>
          ))}
          {scores.length === 0 && <p className="col-span-3 text-center py-8 text-gray-400">Geen reviews gevonden</p>}
        </div>
      )}

      <div className="bg-white rounded-xl border p-5 space-y-3 max-w-lg">
        <h2 className="font-semibold text-secondary">Score toevoegen</h2>
        {saved && <p className="text-success text-sm">Score opgeslagen!</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vestiging *</label>
            <BranchSelector value={formBranch || null} onChange={v => setFormBranch(v ?? '')} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Score (1–5) *</label>
            <input type="number" min="1" max="5" step="0.1" value={formScore} onChange={e => setFormScore(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={saving || !formBranch || !formScore} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'Opslaan…' : 'Score opslaan'}
          </button>
        </form>
      </div>
    </div>
  );
}
