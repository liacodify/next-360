"use client"

import React, { useEffect, useState, useRef } from "react"
import { DataTable, DataTableExpandedRows, DataTableValueArray } from "primereact/datatable"
import { Column } from "primereact/column"
import { Button } from "primereact/button"
import { Dialog } from "primereact/dialog"
import { InputText } from "primereact/inputtext"
import { Toast } from "primereact/toast"
import { Prisma, Project } from "@prisma/client"
import PointMarkersManager from "../../components/PointMarkersManager"

export default function ProjectPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  const [name, setName] = useState("")

  const toast = useRef<Toast>(null)

  // ============================
  // FETCH PROJECTS
  // ============================
  const loadProjects = async () => {
    try {
      const res = await fetch("/api/project")
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error(error)
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar los proyectos",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const rowExpansionTemplate = (data: Project) => {
    return (
      <div className="p-3">
        <PointMarkersManager projectId={data.id} />
      </div>
    )
  }

  // ============================
  // SAVE PROJECT (CREATE or UPDATE)
  // ============================
  const saveProject = async () => {
    try {
      if (editing) {
        // UPDATE
        await fetch("/api/project", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing.id,
            name,
          }),
        })

        toast.current?.show({
          severity: "success",
          summary: "Actualizado",
          detail: "Proyecto actualizado",
        })
      } else {
        // CREATE
        await fetch("/api/project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })

        toast.current?.show({
          severity: "success",
          summary: "Creado",
          detail: "Proyecto creado",
        })
      }

      setModalOpen(false)
      setEditing(null)
      setName("")
      loadProjects()
    } catch (error) {
      console.error(error)
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo guardar",
      })
    }
  }

  // ============================
  // DELETE
  // ============================
  const deleteProject = async (id: number) => {
    try {
      await fetch(`/api/project?id=${id}`, { method: "DELETE" })

      toast.current?.show({
        severity: "success",
        summary: "Eliminado",
        detail: "Proyecto eliminado",
      })

      loadProjects()
    } catch (error) {
      console.error(error)
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar",
      })
    }
  }

  // ============================
  // UI Actions
  // ============================
  const openCreate = () => {
    setEditing(null)
    setName("")
    setModalOpen(true)
  }

  const openEdit = (row: Project) => {
    setEditing(row)
    setName(row.name)
    setModalOpen(true)
  }

  const openAddPoints = (row: Project) => {
    setOpenMarkers(true)
  }

  const [openMarkers, setOpenMarkers] = useState(false)

  const actionTemplate = (row: Project) => (
    <div className="flex gap-2">
      <Button icon="pi pi-pencil" text rounded onClick={() => openEdit(row)} />
      <Button icon="pi pi-list" text rounded onClick={() => openAddPoints(row)} />
      <Button
        icon="pi pi-trash"
        text
        rounded
        severity="danger"
        onClick={() => deleteProject(row.id)}
      />
    </div>
  )

  const [expandedRows, setExpandedRows] = useState<
    DataTableExpandedRows | DataTableValueArray | undefined
  >(undefined)

  const allowExpansion = (rowData: Project) => {
    return true
  }
  return (
    <div className="card p-2">
      <Toast ref={toast} />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Proyectos</h1>
        <Button size="small" label="Nuevo Proyecto" icon="pi pi-plus" onClick={openCreate} />
      </div>

      <DataTable
        size="small"
        value={projects}
        loading={loading}
        expandedRows={expandedRows}
        onRowToggle={(e) => setExpandedRows(e.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        tableStyle={{ minWidth: "40rem" }}
      >
        <Column expander style={{ width: "3rem" }} />
        <Column field="id" header="ID" style={{ width: "4rem" }} />
        <Column field="name" header="Nombre" />
        <Column header="Acciones" body={actionTemplate} style={{ width: "10rem" }} />
      </DataTable>
      <Dialog
        header="Marcadores"
        visible={openMarkers}
        style={{ width: "30rem" }}
        modal
        onHide={() => setModalOpen(false)}
      >
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex justify-end gap-2 mt-4">
            <Button
              label="Cancelar"
              size="small"
              severity="secondary"
              onClick={() => setModalOpen(false)}
            />
            <Button label="Guardar" size="small" onClick={saveProject} />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={editing ? "Editar Proyecto" : "Nuevo Proyecto"}
        visible={modalOpen}
        style={{ width: "30rem" }}
        modal
        onHide={() => setModalOpen(false)}
      >
        <div className="flex flex-col gap-3 mt-2">
          <span className="p-float-label">
            <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
            <label>Nombre del Proyecto</label>
          </span>

          <div className="flex justify-end gap-2 mt-4">
            <Button label="Cancelar" severity="secondary" onClick={() => setModalOpen(false)} />
            <Button label="Guardar" onClick={saveProject} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
