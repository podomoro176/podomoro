export function useCurrencyFormat() {
  function formatEur(cents: number): string {
    return (cents / 100).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
  }
  return { formatEur };
}
