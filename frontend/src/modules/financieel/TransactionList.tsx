import { useEffect, useState } from 'react';
import { getTransactions, exportTransactions } from '@/api/finance';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { useDateFormat } from '@/hooks/useDateFormat';
import Pagination from '@/components/Pagination';
import Spinner from '@/components/Spinner';
import type { Transaction, PaginatedResult } from '@/types';

interface Props { branchId: string | null }

export default function TransactionList({ branchId }: Props) {
  const [result, setResult] = useState<PaginatedResult<Transaction> | null>(null);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const { formatEur } = useCurrencyFormat();
  const { formatDateTime } = useDateFormat();

  useEffect(() => {
    setLoading(true);
    getTransactions({ branchId: branchId ?? undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, paymentMethod: method || undefined, page })
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId, page, dateFrom, dateTo, method]);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportCsv() {
    const blob = await exportTransactions('csv', { branchId: branchId ?? undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
    downloadBlob(blob, 'transacties.csv');
  }

  async function exportPdf() {
    const blob = await exportTransactions('pdf', { branchId: branchId ?? undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
    downloadBlob(blob, 'transacties.pdf');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Van</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tot</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <select value={method} onChange={e => { setMethod(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Alle methoden</option>
          <option value="cash">Contant</option>
          <option value="pin">Pin</option>
          <option value="online">Online</option>
        </select>
        <div className="flex gap-2 ml-auto">
          <button onClick={exportCsv} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">↓ CSV</button>
          <button onClick={exportPdf} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">↓ PDF</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-gray-500 border-b">
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Bedrag</th>
              <th className="px-4 py-3">Methode</th>
              <th className="px-4 py-3">Kassier</th>
            </tr></thead>
            <tbody className="divide-y">
              {(result?.items ?? []).map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDateTime(tx.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold text-secondary">{formatEur(tx.amount)}</td>
                  <td className="px-4 py-3 capitalize">{tx.paymentMethod}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{tx.cashier?.email ?? '—'}</td>
                </tr>
              ))}
              {(result?.items ?? []).length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Geen transacties gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {result && <Pagination page={page} totalPages={result.totalPages} onPageChange={setPage} />}
    </div>
  );
}
