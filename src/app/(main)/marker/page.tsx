"use client"

import React, { useState, useEffect } from "react"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Button } from "primereact/button"
import { Dialog } from "primereact/dialog"
import { InputText } from "primereact/inputtext"
import { Toast } from "primereact/toast"
import { Marker } from "@prisma/client"

export default function MarkersPage() {
  const [markers, setMarkers] = useState<Marker[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Marker | null>(null)

  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")

  const toast = React.useRef<Toast>(null)

  const iconTemplate = (row: Marker) => {
    if (!row.icon) return null

    return (
      <a href={row.icon} target="_blank" rel="noopener noreferrer">
        <img
          src={row.icon}
          alt={row.name}
          style={{
            width: "16px",
            height: "16px",
            objectFit: "contain",
            cursor: "pointer",
          }}
        />
      </a>
    )
  }

  const loadMarkers = async () => {
    try {
      const res = await fetch("/api/marker")
      const data = await res.json()
      setMarkers(data)
    } catch (error) {
      console.error("Error loading markers", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMarkers()
  }, [])

  // ---------- CREATE / UPDATE ----------
  const saveMarker = async () => {
    const payload = { name, icon }

    try {
      if (editing) {
        // UPDATE
        await fetch("/api/marker", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...payload }),
        })
        toast.current?.show({
          severity: "success",
          summary: "Actualizado",
          detail: "Marker actualizado",
        })
      } else {
        // CREATE
        await fetch("/api/marker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        toast.current?.show({ severity: "success", summary: "Creado", detail: "Marker creado" })
      }

      setModalOpen(false)
      setEditing(null)
      setName("")
      setIcon("")
      loadMarkers()
    } catch (error) {
      console.error(error)
      toast.current?.show({ severity: "error", summary: "Error", detail: "No se pudo guardar" })
    }
  }

  // ---------- DELETE ----------
  const deleteMarker = async (id: number) => {
    try {
      await fetch(`/api/marker?id=${id}`, { method: "DELETE" })
      toast.current?.show({ severity: "success", summary: "Eliminado", detail: "Marker eliminado" })
      loadMarkers()
    } catch (error) {
      console.error(error)
      toast.current?.show({ severity: "error", summary: "Error", detail: "No se pudo eliminar" })
    }
  }

  // ---------- OPEN MODAL FOR EDIT ----------
  const editAction = (row: Marker) => {
    setEditing(row)
    setName(row.name)
    setIcon(row.icon ?? "")
    setModalOpen(true)
  }

  // ---------- OPEN MODAL FOR CREATE ----------
  const createAction = () => {
    setEditing(null)
    setName("")
    setIcon("")
    setModalOpen(true)
  }

  // ---------- ACTION BUTTONS ----------
  const actionTemplate = (row: Marker) => (
    <div className="flex gap-2">
      <Button icon="pi pi-pencil" rounded text onClick={() => editAction(row)} />
      <Button
        icon="pi pi-trash"
        severity="danger"
        rounded
        text
        onClick={() => deleteMarker(row?.id)}
      />
    </div>
  )

  return (
    <div className="card p-2">
      <Toast ref={toast} />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Marcadores</h1>

        <Button size="small" label="Nuevo Marcador" icon="pi pi-plus" onClick={createAction} />
      </div>

      <DataTable
        size="small"
        value={markers}
        loading={loading}
        stripedRows
        tableStyle={{ minWidth: "40rem" }}
      >
        <Column field="id" header="ID" style={{ width: "25%" }} />
        <Column field="name" header="Nombre" />
        <Column header="Icono" body={iconTemplate} style={{ width: "120px" }} />

        <Column header="Acciones" body={actionTemplate} style={{ width: "10rem" }} />
      </DataTable>

      <Dialog
        header={editing ? "Editar Marker" : "Nuevo Marker"}
        visible={modalOpen}
        style={{ width: "30rem" }}
        modal
        onHide={() => setModalOpen(false)}
      >
        <div className="flex flex-col gap-3 mt-2">
          <span className="p-float-label">
            <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
            <label>Nombre</label>
          </span>

          <span className="p-float-label">
            <InputText value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full" />
            <label>Icono</label>
          </span>

          <div className="flex justify-end gap-2 mt-4">
            <Button label="Cancelar" severity="secondary" onClick={() => setModalOpen(false)} />
            <Button label="Guardar" onClick={saveMarker} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
