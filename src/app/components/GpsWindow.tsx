import { Rnd } from "react-rnd"

export default function GpsWindow() {
  return (
    <Rnd
      default={{
        x: 100,
        y: 100,
        width: 400,
        height: 300,
      }}
      bounds="window"
    >
      <div
        style={{
          background: "#1e1e1e",
          color: "white",
          borderRadius: 8,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "8px", borderBottom: "1px solid #333" }}>
          <strong>GPS Tracker</strong>
        </div>
        <div style={{ flex: 1, padding: "8px" }}>{/* tu contenido aquí */}</div>
      </div>
    </Rnd>
  )
}
