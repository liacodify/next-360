"use client"

import React, { useEffect } from "react"
import { Button } from "primereact/button"

export default function CustomControls({ videoRef }: any) {
  const video = videoRef.current

  return (
    <div
      style={{
        display: "flex",
        gap: "14px",
        background: "rgba(0,0,0,0.45)",
        padding: "12px 20px",
        borderRadius: "14px",
        color: "white",
        alignItems: "center",
      }}
    >
      <Button
        icon="pi pi-step-backward"
        label="- 1 sec"
        size="small"
        text
        className="p-button-rounded p-button-secondary"
        onClick={() => (video.currentTime -= 1)}
        style={{ color: "white" }} // ← TEXTO BLANCO
      />

      <Button
        icon="pi pi-step-forward"
        label="+ 1 sec"
        size="small"
        text
        className="p-button-rounded p-button-secondary"
        onClick={() => (video.currentTime += 1)}
        style={{ color: "white" }} // ← TEXTO BLANCO
      />
    </div>
  )
}
