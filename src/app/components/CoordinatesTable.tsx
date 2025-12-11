"use client"

import React, { useEffect, useMemo, useState, useRef } from "react"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"

interface GpsPoint {
  lat: number
  lon: number
  second: number
}

interface Props {
  points: GpsPoint[]
  currentTime: number
  setCurrentTime: any
}

export default function CoordinatesTable({ points, currentTime, setCurrentTime }: Props) {
  const sortedPoints = [...points].sort((a, b) => a.second - b.second)

  const [lazyItems, setLazyItems] = useState<any[]>([])
  const tableRef = useRef<any>(null)
  const [selectedPoint, setSelectedPoint] = useState<any>(null)

  const itemSize = 40

  const activeIndex = useMemo(() => {
    return sortedPoints.findIndex((p) => p.second === currentTime)
  }, [currentTime, sortedPoints])

  useEffect(() => {
    setLazyItems([...sortedPoints])
  }, [points])

  /** SCROLL REAL: basado en VirtualScroller */
  useEffect(() => {
    if (activeIndex < 0) return

    setSelectedPoint(sortedPoints[activeIndex])

    requestAnimationFrame(() => {
      const table = tableRef.current?.getElement()
      if (!table) return

      const vs =
        table.querySelector(".p-virtualscroller-content") ||
        table.querySelector(".p-virtualscroller")

      if (!vs) return

      vs.scrollTop = activeIndex * itemSize
    })
  }, [activeIndex])

  return (
    <DataTable
      ref={tableRef}
      value={lazyItems}
      size="small"
      selectionMode="single"
      selection={selectedPoint}
      onSelectionChange={(e) => {
        setSelectedPoint(e.value)
        if (e.value?.second !== undefined) {
          setCurrentTime(e.value.second)
        }
      }}
      scrollable
      scrollHeight="400px"
      lazy
      virtualScrollerOptions={{
        itemSize,
        lazy: true,
        showLoader: true,
      }}
      rowClassName={(row: GpsPoint) =>
        row?.second === currentTime ? "bg-blue-200 dark:bg-blue-700" : ""
      }
    >
      <Column field="second" header="Second" />
      <Column field="lat" header="Latitude" />
      <Column field="lon" header="Longitude" />
    </DataTable>
  )
}
