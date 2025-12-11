"use client"

import React, { useEffect, useState } from "react"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Button } from "primereact/button"
import { Dialog } from "primereact/dialog"
import { InputText } from "primereact/inputtext"
import { Toast } from "primereact/toast"
import { PointMarker, Marker } from "@prisma/client"

interface PointMarkerWithMarker extends PointMarker {
  marker?: Marker | null
}

interface Props {
  projectId: number
}

export default function PointMarkersManager({ projectId }: Props) {
  const toast = React.useRef<Toast>(null)

  const [points, setPoints] = useState<PointMarkerWithMarker[]>([])
  const [markers, setMarkers] = useState<Marker[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(false)

  const [form, setForm] = useState({
    id: 0,
    lat: "",
    lon: "",
    comment: "",
    markerId: "",
  })

  // -------------------------------------
  // LOAD DATA
  // -------------------------------------
  const loadData = async () => {
    try {
      setLoading(true)

      const [pointsRes, markersRes] = await Promise.all([
        fetch(`/api/point-marker?projectId=${projectId}`),
        fetch(`/api/marker`),
      ])

      const pointsData = await pointsRes.json()
      const markersData = await markersRes.json()

      setPoints(pointsData)
      setMarkers(markersData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  // -------------------------------------
  // OPEN MODAL FOR CREATE
  // -------------------------------------
  const openCreate = () => {
    setEditing(false)
    setForm({
      id: 0,
      lat: "",
      lon: "",
      comment: "",
      markerId: "",
    })
    setModalOpen(true)
  }

  // -------------------------------------
  // OPEN MODAL FOR EDIT
  // -------------------------------------
  const openEdit = (row: PointMarkerWithMarker) => {
    setEditing(true)
    setForm({
      id: row.id,
      lat: String(row.lat),
      lon: String(row.lon),
      comment: row.comment,
      markerId: String(row.markerId),
    })
    setModalOpen(true)
  }

  // -------------------------------------
  // DELETE
  // -------------------------------------
  const deletePoint = async (row: PointMarkerWithMarker) => {
    if (!confirm("¿Eliminar el point marker?")) return

    const res = await fetch(`/api/point-marker?id=${row.id}`, {
      method: "DELETE",
    })

    if (res.ok) {
      toast.current?.show({ severity: "success", summary: "Eliminado" })
      loadData()
    } else {
      toast.current?.show({ severity: "error", summary: "Error al eliminar" })
    }
  }

  // -------------------------------------
  // SAVE CREATE/EDIT
  // -------------------------------------
  const savePoint = async () => {
    const data = {
      id: editing ? form.id : undefined,
      lat: Number(form.lat),
      lon: Number(form.lon),
      comment: form.comment,
      markerId: Number(form.markerId),
      projectId,
      createdById: 1, // <- cámbialo según tu auth
    }

    const method = editing ? "PUT" : "POST"

    const res = await fetch("/api/point-marker", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      toast.current?.show({ severity: "success", summary: "Guardado" })
      setModalOpen(false)
      loadData()
    } else {
      toast.current?.show({ severity: "error", summary: "Error al guardar" })
    }
  }

  // -------------------------------------
  // EXPORT CSV
  // -------------------------------------
  const exportCSV = () => {
    const rows = points.map((p) => ({
      id: p.id,
      lat: p.lat,
      lon: p.lon,
      comment: p.comment,
      markerId: p.markerId,
    }))

    const header = Object.keys(rows[0]).join(",")
    const csv = [header, ...rows.map((r) => Object.values(r).join(","))].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `project_${projectId}_pointmarkers.csv`
    a.click()

    URL.revokeObjectURL(url)
  }

  // -------------------------------------
  // IMPORT CSV
  // -------------------------------------
  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.trim().split("\n")

      const rows = lines.slice(1).map((line) => {
        const [lat, lon, comment, markerId] = line.split(",")
        return { lat, lon, comment, markerId }
      })

      for (const row of rows) {
        await fetch("/api/point-marker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: Number(row.lat),
            lon: Number(row.lon),
            comment: row.comment,
            markerId: Number(row.markerId),
            projectId,
            createdById: 1,
          }),
        })
      }

      toast.current?.show({ severity: "success", summary: "Importado" })
      loadData()
    }

    reader.readAsText(file)
    e.target.value = ""
  }

  // -------------------------------------
  // ACTION TEMPLATE
  // -------------------------------------
  const actionTemplate = (row: PointMarkerWithMarker) => (
    <div className="flex gap-2">
      <Button icon="pi pi-pencil" text rounded onClick={() => openEdit(row)} />
      <Button icon="pi pi-trash" text rounded severity="danger" onClick={() => deletePoint(row)} />
    </div>
  )

  return (
    <div className="card p-3">
      <Toast ref={toast} />

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold">Point Markers</h2>

        <div className="flex gap-2">
          <Button label="Nuevo" icon="pi pi-plus" onClick={openCreate} />
          <Button label="Exportar CSV" icon="pi pi-download" onClick={exportCSV} />

          <Button
            label="Importar CSV"
            icon="pi pi-upload"
            onClick={() => document.getElementById("csvInput")?.click()}
          />
          <input id="csvInput" type="file" accept=".csv" hidden onChange={importCSV} />
        </div>
      </div>

      <DataTable value={points} loading={loading} stripedRows size="small">
        <Column field="id" header="ID" style={{ width: "80px" }} />
        <Column field="lat" header="Lat" />
        <Column field="lon" header="Lon" />
        <Column field="comment" header="Comentario" />
        <Column header="Marker" body={(row) => row.marker?.name} />
        <Column header="Acciones" body={actionTemplate} style={{ width: "8rem" }} />
      </DataTable>

      {/* MODAL */}
      <Dialog
        header={editing ? "Editar" : "Crear"}
        visible={modalOpen}
        style={{ width: "30rem" }}
        modal
        onHide={() => setModalOpen(false)}
      >
        <div className="flex flex-col gap-3">
          <InputText
            value={form.lat}
            placeholder="Latitud"
            onChange={(e) => setForm({ ...form, lat: e.target.value })}
          />
          <InputText
            value={form.lon}
            placeholder="Longitud"
            onChange={(e) => setForm({ ...form, lon: e.target.value })}
          />
          <InputText
            value={form.comment}
            placeholder="Comentario"
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />

          {/* MARKER SELECT */}
          <select
            className="p-inputtext p-component"
            value={form.markerId}
            onChange={(e) => setForm({ ...form, markerId: e.target.value })}
          >
            <option value="">Seleccione un marker</option>
            {markers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <Button label="Guardar" className="w-full" onClick={savePoint} />
        </div>
      </Dialog>
    </div>
  )
}
