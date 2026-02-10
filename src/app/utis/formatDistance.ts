export function formatDistance(meters: number) {
  const km = Math.floor(meters / 1000);
  const m = meters % 1000;
  return `${km}+${m.toFixed(3)}`;
}
