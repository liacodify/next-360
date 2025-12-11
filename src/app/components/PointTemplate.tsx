import { GpsPoint } from "@prisma/client"
import { formatDistance } from "../utis/formatDistance"

export default function PointTemplate({ p, startKm }: { p: GpsPoint; startKm: number }) {
  const distance = startKm + p.totalDistance
  return (
    <div className="flex flex-col py-1">
      <span className="font-semibold">{formatDistance(distance)}</span>

      <span className="text-sm text-gray-800">
        {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
      </span>
    </div>
  )
}
