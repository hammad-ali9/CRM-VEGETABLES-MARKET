export type PrintPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

export function isWithinPrintPeriod(dateStr: string | null | undefined, period: PrintPeriod): boolean {
  if (!dateStr) return period === 'all';
  const d = new Date(dateStr);
  const now = new Date();

  if (period === 'daily') {
    return dateStr.slice(0, 10) === now.toISOString().slice(0, 10);
  }
  if (period === 'weekly') {
    const day = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek && d <= now;
  }
  if (period === 'monthly') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  return true; // 'all'
}

export function getPeriodLabel(period: PrintPeriod): string {
  const now = new Date();
  if (period === 'daily') return `Daily — ${now.toLocaleDateString()}`;
  if (period === 'weekly') return `Weekly — ${now.toLocaleDateString()}`;
  if (period === 'monthly') return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
  return 'All Time';
}
