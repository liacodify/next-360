import { useEffect, useState } from "react"
import { formatDistance } from "../utis/formatDistance"
import GpsMap from "./GpsMap"
import PointTemplate from "./PointTemplate"
import { GpsPoint } from "@prisma/client"

interface Props {
  points: GpsPoint[]
  currentTime: number
  startKm: number
}
export default function ResumenCoordinates({ points, currentTime, startKm }: Props) {
  const [data, setData] = useState<GpsPoint[]>([])
  useEffect(() => {
    const index = points.findIndex((e) => Number(e.second) === currentTime)

    if (index !== -1) {
      const prevIndex = index > 0 ? index - 1 : null
      const nextIndex = index < points.length - 1 ? index + 1 : null

      const newData = []

      if (prevIndex !== null) newData.push(points[prevIndex])
      newData.push(points[index])
      if (nextIndex !== null) newData.push(points[nextIndex])

      setData(newData)
    }
  }, [currentTime])

  return (
    <>
      {data.map((e, index) => {
        const style = {
          fontSize: index === 1 ? "14px" : "7px",
          opacity: index === 1 ? 1 : 0.5,
          transition: "all 0.3s ease",
        }

        return (
          <div key={index} style={style}>
            <PointTemplate p={e} startKm={startKm} />
          </div>
        )
      })}
    </>
  )
}
