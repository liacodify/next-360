"use client"

import { useState } from "react"
import { Button } from "primereact/button"
import { Dialog } from "primereact/dialog"
import GalleryForm from "../../components/GalleryForm"
import GalleryTable from "../../components/GalleryTable"

export default function GalleryPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingData, setEditingData] = useState<any | null>(null)

  const openCreate = () => {
    setEditingData(null) // para crear nuevo sin datos
    setModalOpen(true)
  }

  const openEdit = (data: any) => {
    setEditingData(data)
    setModalOpen(true)
  }

  return (
    <div className="flex w-full flex-col h-full p-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Galeria</h1>
        <Button size="small" label="Nuevo Elemento" icon="pi pi-plus" onClick={openCreate} />
      </div>

      <GalleryTable onEdit={openEdit} />

      <Dialog
        header={editingData ? "Editar Elemento" : "Nuevo Elemento"}
        visible={modalOpen}
        style={{ width: "30rem" }}
        modal
        onHide={() => setModalOpen(false)}
      >
        <GalleryForm initialData={editingData || undefined} />
      </Dialog>
    </div>
  )
}
