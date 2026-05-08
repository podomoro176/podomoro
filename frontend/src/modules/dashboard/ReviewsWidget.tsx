import type { ReviewBranch } from '@/types';

const COLOR_CLS = { green: 'text-success', amber: 'text-warning', red: 'text-danger' };

interface Props { reviews: ReviewBranch[] }

function Stars({ score }: { score: number }) {
  return (
    <span className="text-accent">
      {Array.from({ length: 5 }, (_, i) => i < Math.round(score) ? '★' : '☆').join('')}
    </span>
  );
}

export default function ReviewsWidget({ reviews }: Props) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold text-secondary mb-3">Reviews</h3>
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Geen reviews beschikbaar</p>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.branch.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary truncate">{r.branch.name}</p>
                {r.currentScore !== null && <Stars score={r.currentScore} />}
              </div>
              {r.currentScore !== null && (
                <span className={`text-lg font-bold ${r.color ? COLOR_CLS[r.color] : 'text-gray-400'}`}>
                  {r.currentScore.toFixed(1)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
