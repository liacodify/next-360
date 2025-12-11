import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PanelMenu } from "primereact/panelmenu"
import { MenuItem } from "primereact/menuitem"
import { Toast } from "primereact/toast"
import { GpsPoint, Marker, PointMarker, Tag } from "@prisma/client"

export type PointMarkerWithTags = PointMarker & { tags?: Tag[]; marker: Marker | undefined }

type GroupedMarker = {
  markerId: number
  marker: Marker
  items: PointMarkerWithTags[]
}

interface LegendMenuProps {
  tags: Tag[]
  pointsMarkers: PointMarkerWithTags[]
  onSelectPosition: (pos: GpsPoint) => void
  visibleGroups: Record<number, boolean>
  setVisibleGroups: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
}

const LegendMenu: React.FC<LegendMenuProps> = React.memo(function LegendMenu({
  tags,
  pointsMarkers,
  onSelectPosition,
  visibleGroups,
  setVisibleGroups,
}) {
  const toast = useRef<Toast>(null)

  const pointsWithTags = useMemo(() => {
    if (!tags?.length) return pointsMarkers

    return pointsMarkers.map((pm) => ({
      ...pm,
      tags: pm.Tags?.map((tagId) => tags.find((t) => t.id === tagId)).filter(Boolean) as Tag[],
    }))
  }, [pointsMarkers, tags])

  // Agrupamos por markerId como antes
  const groups = useMemo(() => {
    const map = new Map<number, GroupedMarker>()
    for (const item of pointsWithTags) {
      if (!map.has(item.markerId || 0)) {
        map.set(item.markerId || 0, {
          markerId: item.markerId!,
          marker: item.marker!,
          items: [],
        })
      }
      map.get(item.markerId || 0)!.items.push(item)
    }
    return Array.from(map.values())
  }, [pointsWithTags])

  const toggleGroup = useCallback(
    (markerId: number) => {
      setVisibleGroups((prev) => ({
        ...prev,
        [markerId]: !prev[markerId],
      }))
    },
    [setVisibleGroups]
  )

  const generateMenuModel = () => {
    return groups.map(({ marker, items }) => {
      const enabled = visibleGroups[marker.id] ?? false

      // Agrupar items por tag (nombre)
      const groupedByTag = new Map<string, PointMarkerWithTags[]>()
      const noTagItems: PointMarkerWithTags[] = []

      items.forEach((item) => {
        if (item.tags && item.tags.length > 0) {
          item.tags.forEach((tag) => {
            if (!groupedByTag.has(tag.name)) {
              groupedByTag.set(tag.name, [])
            }
            groupedByTag.get(tag.name)!.push(item)
          })
        } else {
          noTagItems.push(item)
        }
      })

      const tagGroupsMenuItems: MenuItem[] = []

      for (const [tagName, taggedItems] of groupedByTag.entries() as any) {
        tagGroupsMenuItems.push({
          label: tagName,
          icon: "pi pi-tags",
          expanded: true,
          items: taggedItems.map((item: any) => ({
            label: `ID ${item.id}`,
            data: item,
            icon: "pi pi-circle",
            disabled: !enabled,
            template: (subItem: MenuItem) => {
              const item = subItem.data as PointMarkerWithTags
              const tagColor = item.tags && item.tags.length > 0 ? item.tags[0].color : undefined

              return (
                <div
                  className={`flex flex-col gap-1 p-2 pl-4 rounded text-xs ${
                    enabled ? "cursor-pointer hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
                  }`}
                  onClick={() => enabled && onSelectPosition(item as any)}
                >
                  <div className="flex items-center gap-2">
                    <i className="pi pi-map-marker text-sm text-blue-500" />
                    <span className="font-semibold">{subItem.data.description}</span>
                  </div>
                  <div className="ml-6 text-[11px] text-gray-600 leading-tight flex items-center gap-1">
                    {/* Badge de color del primer tag */}
                    {tagColor && (
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: `#${tagColor}`,
                          boxShadow: `0 0 5px #${tagColor}`,
                        }}
                      />
                    )}
                    <div>
                      <span className="font-medium"></span> {item.comment}
                    </div>
                  </div>
                  <div className="ml-6 text-[11px] text-gray-600 leading-tight">
                    <div>
                      <span className="font-medium">Lat:</span> {item.lat}
                    </div>
                    <div>
                      <span className="font-medium">Lon:</span> {item.lon}
                    </div>
                  </div>
                </div>
              )
            },
          })),
        })
      }

      if (noTagItems.length > 0) {
        tagGroupsMenuItems.push({
          label: "Sin etiqueta",
          icon: "pi pi-tag",
          expanded: true,
          items: noTagItems.map((item) => ({
            label: `ID ${item.id}`,
            data: item,
            icon: "pi pi-circle",
            disabled: !enabled,
            template: (subItem: MenuItem) => (
              <div
                className={`flex flex-col gap-1 p-2 pl-4 rounded text-xs ${
                  enabled ? "cursor-pointer hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
                }`}
                onClick={() => enabled && onSelectPosition(item as any)}
              >
                <div className="flex items-center gap-2">
                  <i className="pi pi-map-marker text-sm text-blue-500" />
                  <span className="font-semibold">{subItem.data.description}</span>
                </div>
                <div className="ml-6 text-[11px] text-gray-600 leading-tight">
                  <div>
                    <span className="font-medium"></span> {item.comment}
                  </div>
                  <div>
                    <span className="font-medium">Lat:</span> {item.lat}
                  </div>
                  <div>
                    <span className="font-medium">Lon:</span> {item.lon}
                  </div>
                </div>
              </div>
            ),
          })),
        })
      }

      return {
        label: marker.name,
        icon: "pi pi-map-marker",
        expanded: true,
        disabled: !enabled,
        template: (item: MenuItem, opt: any) => (
          <div
            className={`flex items-center gap-2 p-2 text-sm rounded ${
              enabled ? "cursor-pointer hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
            }`}
            onClick={(e) => {
              if (!enabled) return
              if ((e.target as HTMLElement).tagName !== "INPUT") {
                opt.onClick?.(e)
              }
            }}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => toggleGroup(marker.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <i className="pi pi-map-marker text-sm" />
            <span>{item.label}</span>
          </div>
        ),
        items: tagGroupsMenuItems,
      }
    })
  }

  const [menuModel, setMenuModel] = useState<MenuItem[]>([])

  useEffect(() => {
    if (groups.length > 0) {
      setVisibleGroups((prev) => {
        if (Object.keys(prev).length === 0) {
          return Object.fromEntries(groups.map((g) => [g.markerId, true]))
        }
        return prev
      })
    }
    setMenuModel(generateMenuModel())
  }, [groups, visibleGroups])

  return (
    <>
      <Toast ref={toast} />
      <PanelMenu model={menuModel} className="!w-full" />
    </>
  )
})

export default LegendMenu
