"use client"

import { useEffect, useState } from "react"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Dialog } from "primereact/dialog"
import { InputText } from "primereact/inputtext"
import { Button } from "primereact/button"
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog"
import "primereact/resources/themes/lara-light-blue/theme.css"
import "primereact/resources/primereact.min.css"
import "primeicons/primeicons.css"
import { ColorPicker } from "primereact/colorpicker"

type Tag = {
  id: number
  name: string
  color?: string | null
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)

  const [form, setForm] = useState<any>({ name: "", color: "" })

  // -----------------------------
  // Fetch inicial
  // -----------------------------
  const loadTags = async () => {
    setLoading(true)
    const res = await fetch("/api/tag")
    const data = await res.json()
    setTags(data)
    setLoading(false)
  }

  useEffect(() => {
    loadTags()
  }, [])

  // -----------------------------
  // Abrir modal Crear
  // -----------------------------
  const openNew = () => {
    setForm({ name: "", color: "" })
    setEditingTag(null)
    setDialogOpen(true)
  }

  // -----------------------------
  // Abrir modal Editar
  // -----------------------------
  const openEdit = (tag: Tag) => {
    setForm({ name: tag.name, color: tag.color ?? "" })
    setEditingTag(tag)
    setDialogOpen(true)
  }

  // -----------------------------
  // Guardar: create o update
  // -----------------------------
  const saveTag = async () => {
    if (!form.name.trim()) return alert("El nombre es obligatorio")

    if (editingTag) {
      // actualizar
      await fetch(`/api/tag/${editingTag.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      })
    } else {
      // crear
      await fetch("/api/tag", {
        method: "POST",
        body: JSON.stringify(form),
      })
    }

    setDialogOpen(false)
    await loadTags()
  }

  // -----------------------------
  // Confirmación eliminar
  // -----------------------------
  const removeTag = (tag: Tag) => {
    confirmDialog({
      message: `¿Eliminar el tag "${tag.name}"?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: async () => {
        await fetch(`/api/tag/${tag.id}`, { method: "DELETE" })
        await loadTags()
      },
    })
  }

  // -----------------------------
  // Template acciones
  // -----------------------------
  const actionsTemplate = (row: Tag) => (
    <div className="flex gap-2">
      <Button icon="pi pi-pencil" size="small" onClick={() => openEdit(row)} />
      <Button icon="pi pi-trash" severity="danger" size="small" onClick={() => removeTag(row)} />
    </div>
  )

  return (
    <div className="p-6">
      <ConfirmDialog />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Tags</h1>
        <Button size="small" label="Nuevo Tag" icon="pi pi-plus" onClick={openNew} />
      </div>

      {/* Tabla */}
      <DataTable value={tags} loading={loading} paginator rows={10} className="shadow rounded-lg">
        <Column field="id" header="ID" style={{ width: "80px" }} />
        <Column field="name" header="Nombre" />
        <Column
          field="color"
          header="Color"
          body={(e: any) => {
            return (
              <>
                <ColorPicker value={e.color} />
              </>
            )
          }}
        />
        <Column body={actionsTemplate} header="Acciones" style={{ width: "150px" }} />
      </DataTable>

      {/* Dialog Crear/Editar */}
      <Dialog
        header={editingTag ? "Editar Tag" : "Nuevo Tag"}
        visible={dialogOpen}
        style={{ width: "30rem" }}
        onHide={() => setDialogOpen(false)}
      >
        <div className="flex flex-col gap-4 mt-4">
          <div>
            <label className="font-medium">Nombre</label>
            <InputText
              className="w-full mt-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <div>
              <label className="font-medium ">Color (opcional)</label>
            </div>
            {/* <InputText className="w-full mt-2" value={form.color} /> */}

            <ColorPicker
              onChange={(e) => setForm({ ...form, color: e?.target?.value || "" })}
              value={form.color}
              inline
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button label="Cancelar" severity="secondary" onClick={() => setDialogOpen(false)} />
            <Button label="Guardar" onClick={saveTag} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
