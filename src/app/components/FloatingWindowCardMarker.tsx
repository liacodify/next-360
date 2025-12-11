import { Rnd } from "react-rnd"
import CardMarker from "./CardMarker"
import { useState } from "react"

export default function FloatingWindow({ addMarker }: { addMarker: any }) {
  const [open, setOpen] = useState(true)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ position: "absolute", top: "1rem", right: "1rem" }}
      >
        Abrir
      </button>
    )
  }

  return (
    <>
      <Rnd
        default={{
          x: 10,
          y: 80,
          width: 200,
          height: 300,
        }}
        bounds="window"
        style={{
          background: "#1e1e1e",
          borderRadius: "8px",
          border: "1px solid #333",
          backgroundColor: "rgba(0,0,0,0.6)",

          color: "white",
          overflow: "hidden",
          zIndex: 12123,
        }}
      >
        <div
          style={{
            padding: "1px 2px",
            background: "#2a2a2a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "move",
          }}
          className="draggable"
        >
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              fontSize: "16px",
            }}
          >
            ✖
          </button>
        </div>

        <CardMarker onMarkerClick={addMarker} />
      </Rnd>
    </>
  )
}
