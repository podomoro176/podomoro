import { useEffect, useState } from 'react';
import { listLeave, reviewLeave } from '@/api/hr';
import Spinner from '@/components/Spinner';
import type { LeaveRequest } from '@/types';

const TYPE_LABELS = { vakantie: 'Vakantie', ziek: 'Ziek', bijzonder_verlof: 'Bijzonder verlof' };

export default function LeaveApprovalPanel() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    listLeave({ status: 'pending' }).then(setRequests).finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    await reviewLeave(id, { status });
    reload();
  }

  if (loading) return <div className="flex justify-center py-4"><Spinner /></div>;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold text-secondary mb-4">Verlofaanvragen ({requests.length})</h3>
      {requests.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Geen pending aanvragen</p>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary">{r.employee?.name ?? 'Medewerker'}</p>
                <p className="text-xs text-gray-500">{TYPE_LABELS[r.type]} · {r.startDate.slice(0, 10)} t/m {r.endDate.slice(0, 10)}</p>
                {r.reason && <p className="text-xs text-gray-400 mt-0.5 truncate">{r.reason}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleReview(r.id, 'approved')} className="px-3 py-1.5 bg-success text-white text-xs font-semibold rounded-lg touch-min">✓</button>
                <button onClick={() => handleReview(r.id, 'rejected')} className="px-3 py-1.5 bg-danger text-white text-xs font-semibold rounded-lg touch-min">✗</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
