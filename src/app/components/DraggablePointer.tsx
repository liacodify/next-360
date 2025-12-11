import { Marker, Popup } from "react-leaflet"
import L from "leaflet"
import React from "react"

interface MarkerType {
  id: number | string
  position: [number, number]
  icon?: L.Icon
}

interface Props {
  markers: MarkerType[]
  addingMode: boolean
  setAddingMode: React.Dispatch<React.SetStateAction<boolean>>
  setMarkers: React.Dispatch<React.SetStateAction<MarkerType[]>>
}

export default function DraggablePointer({
  markers,
  setMarkers,
  addingMode,
  setAddingMode,
}: Props) {
  return (
    <>
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={m.position}
          draggable
          icon={m.icon}
          eventHandlers={{
            dragend: (e) => {
              const pos = e.target.getLatLng()
              setMarkers((prev) =>
                prev.map((mk) => (mk.id === m.id ? { ...mk, position: [pos.lat, pos.lng] } : mk))
              )
            },
          }}
        >
          <Popup>
            Pointer #{m.id}
            <br />
            <button onClick={() => setMarkers((prev) => prev.filter((mk) => mk.id !== m.id))}>
              ❌ Eliminar
            </button>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
