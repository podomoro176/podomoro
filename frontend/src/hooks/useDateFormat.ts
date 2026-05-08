export function useDateFormat() {
  function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', ...opts }).format(new Date(iso));
  }

  function formatDateTime(iso: string): string {
    return formatDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatDay(iso: string): string {
    return formatDate(iso, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  return { formatDate, formatDateTime, formatDay };
}
