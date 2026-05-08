interface Props {
  label: string;
  value: string | number;
  subtext?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const borderColors = {
  primary: 'border-l-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
};

export default function KpiCard({ label, value, subtext, color = 'primary' }: Props) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${borderColors[color]}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-secondary mt-1">{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
}
