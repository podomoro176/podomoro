import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import BranchSelector from '@/components/BranchSelector';
import WasteEntryForm from './WasteEntryForm';
import WasteList from './WasteList';
import WasteTotalsChart from './WasteTotalsChart';

export default function WastePage() {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const isManager = user?.role === 'manager' || user?.role === 'owner';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-secondary">Afvalbeheer</h1>
        <BranchSelector value={branchId} onChange={setBranchId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <WasteEntryForm branchId={branchId} onSaved={() => setRefresh(r => r + 1)} />
          <WasteTotalsChart branchId={branchId} />
        </div>
        <WasteList branchId={branchId} refresh={refresh} isManager={isManager} />
      </div>
    </div>
  );
}
