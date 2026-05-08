import type { Shift } from '@/types';

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

function getWeekDates(week: string): Date[] {
  const [year, w] = week.split('-W').map(Number);
  const jan4 = new Date(year, 0, 4);
  const startOfWeek = new Date(jan4);
  startOfWeek.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (w - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });
}

interface Props {
  shifts: Shift[];
  week: string;
  onPrev: () => void;
  onNext: () => void;
}

export default function WeekScheduleGrid({ shifts, week, onPrev, onNext }: Props) {
  const dates = getWeekDates(week);
  const employees = [...new Map(shifts.map(s => [s.employeeId, s.employee])).values()];

  function shiftsFor(employeeId: string, dateIndex: number): Shift[] {
    const d = dates[dateIndex];
    const dateStr = d.toISOString().slice(0, 10);
    return shifts.filter(s => s.employeeId === employeeId && s.date.slice(0, 10) === dateStr);
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onPrev} className="px-3 py-1 rounded border hover:bg-gray-50">← Vorige week</button>
        <span className="font-semibold text-secondary">Week {week}</span>
        <button onClick={onNext} className="px-3 py-1 rounded border hover:bg-gray-50">Volgende week →</button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-500 min-w-32">Medewerker</th>
              {DAYS.map((day, i) => (
                <th key={day} className="text-center px-2 py-3 font-medium text-gray-500 min-w-24">
                  <div>{day}</div>
                  <div className="text-xs font-normal">{dates[i].getDate()}/{dates[i].getMonth() + 1}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {employees.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Geen diensten gepland</td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-secondary">{emp.name}</td>
                  {DAYS.map((_, i) => {
                    const dayShifts = shiftsFor(emp.id, i);
                    return (
                      <td key={i} className="px-2 py-2 text-center">
                        {dayShifts.map(s => (
                          <div key={s.id} className="bg-primary/10 text-primary text-xs rounded px-1 py-0.5 mb-1">
                            {s.startTime.slice(11, 16)}–{s.endTime.slice(11, 16)}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
