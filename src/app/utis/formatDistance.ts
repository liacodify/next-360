export function formatDistance(meters: number) {
  const km = Math.floor(meters / 1000)
  const m = meters % 1000
  return `${km}k + ${m.toFixed(3)}m`
}
