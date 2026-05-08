import { useState } from 'react';
import BranchSelector from '@/components/BranchSelector';
import FinanceDashboard from './FinanceDashboard';
import TransactionList from './TransactionList';
import PayrollView from './PayrollView';
import WasteFinanceView from './WasteFinanceView';

type Tab = 'dashboard' | 'transacties' | 'payroll' | 'afval';

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'transacties', label: 'Transacties' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'afval', label: 'Afval' },
];

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [branchId, setBranchId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-secondary">Financieel</h1>
        <BranchSelector value={branchId} onChange={setBranchId} />
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
              ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <FinanceDashboard branchId={branchId} />}
      {tab === 'transacties' && <TransactionList branchId={branchId} />}
      {tab === 'payroll' && <PayrollView branchId={branchId} />}
      {tab === 'afval' && <WasteFinanceView branchId={branchId} />}
    </div>
  );
}
