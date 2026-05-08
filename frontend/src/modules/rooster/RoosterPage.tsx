import { useEffect, useState } from 'react';
import { getSchedule, getMyShifts } from '@/api/hr';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/Spinner';
import WeekScheduleGrid from './WeekScheduleGrid';
import ClockInOut from './ClockInOut';
import LeaveRequestForm from './LeaveRequestForm';
import LeaveApprovalPanel from './LeaveApprovalPanel';
import AttendanceVariance from './AttendanceVariance';
import type { Shift } from '@/types';

function currentWeek(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const week = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + (jan4.getDay() || 7) - 1) / 7) + 1;
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function addWeeks(week: string, delta: number): string {
  const [y, w] = week.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (w - 1 + delta) * 7);
  const year = start.getFullYear();
  const jan4New = new Date(year, 0, 4);
  const newWeek = Math.ceil(((start.getTime() - jan4New.getTime()) / 86400000 + (jan4New.getDay() || 7) - 1) / 7) + 1;
  return `${year}-W${String(newWeek).padStart(2, '0')}`;
}

export default function RoosterPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'owner';
  const [week, setWeek] = useState(currentWeek);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetch = isManager
      ? getSchedule(week, user?.branchId ?? undefined)
      : getMyShifts();
    fetch.then(setShifts).catch(() => {}).finally(() => setLoading(false));
  }, [week, isManager, user?.branchId]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-secondary">Rooster</h1>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size={40} /></div>
      ) : (
        <WeekScheduleGrid
          shifts={shifts}
          week={week}
          onPrev={() => setWeek(w => addWeeks(w, -1))}
          onNext={() => setWeek(w => addWeeks(w, 1))}
        />
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <ClockInOut />
        <LeaveRequestForm onSuccess={() => {}} />
      </div>

      {isManager && (
        <div className="grid lg:grid-cols-2 gap-5">
          <LeaveApprovalPanel />
          <AttendanceVariance />
        </div>
      )}
    </div>
  );
}
