import { useEffect, useState } from 'react';
import api from '@/api/axios';
import type { Branch } from '@/types';

interface Props {
  value: string | null;
  onChange: (branchId: string | null) => void;
}

export default function BranchSelector({ value, onChange }: Props) {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    api.get('/branches').then(({ data }) => setBranches(data.data ?? [])).catch(() => {});
  }, []);

  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">Alle vestigingen</option>
      {branches.map(b => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}
