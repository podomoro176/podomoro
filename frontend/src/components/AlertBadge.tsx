interface Props { count: number; color?: 'danger' | 'warning' }

export default function AlertBadge({ count, color = 'danger' }: Props) {
  if (count === 0) return null;
  const cls = color === 'danger' ? 'bg-danger' : 'bg-warning';
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold ${cls}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
