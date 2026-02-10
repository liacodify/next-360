"use client";

import React, { useEffect, useState } from "react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Button } from "primereact/button";
import { useRouter } from "next/navigation";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Dialog } from "primereact/dialog";
import GalleryForm from "./GalleryForm";
import { Tag as ITag } from "@prisma/client";
import { Tag } from "primereact/tag";

type FileType = {
  id: number;
  order: number;
  duration: number;
  tagIds: number[];
};

type VideoCollection = {
  id: number;
  name: string;
  date: string;
  project: {
    name: string;
  };
  tagIds: number[];
  files: FileType[];
};

type GalleryTableProps = {
  reloadSignal?: number;
  onEdit?: (data: VideoCollection) => void;
};

export default function GalleryTable({
  reloadSignal,
  onEdit,
}: GalleryTableProps) {
  const [videoCollections, setVideoCollections] = useState<VideoCollection[]>(
    [],
  );
  const [expandedRows, setExpandedRows] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any | null>(null);
  const [selectCollectionId, setSelectCollectionId] = useState<number | null>(
    null,
  );

  const router = useRouter();

  async function fetchCollections() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/video-collection");
      const data = await res.json();
      setVideoCollections(data);
    } finally {
      setIsLoading(false);
    }
  }

  const [tags, setTags] = useState<ITag[]>([]);
  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tag");

      setTags((await res.json()) as ITag[]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    fetchTags();
  }, []);

  useEffect(() => {
    if (reloadSignal !== undefined) {
      fetchCollections();
    }
  }, [reloadSignal]);

  const tagsTemplate = (tagIds: number[]) => {
    if (!tagIds || tagIds.length === 0) {
      return <span className="text-gray-400">—</span>;
    }

    const relatedTags = tags.filter((tag) => tagIds.includes(tag.id));

    if (relatedTags.length === 0) {
      return <span className="text-gray-400">—</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {relatedTags.map((tag) => (
          <Tag key={tag.id} value={tag.name} />
        ))}
      </div>
    );
  };

  const handleDeleteCollection = (id: number) => {
    confirmDialog({
      message: "¿Eliminar la colección?",
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      accept: async () => {
        await fetch(`/api/video-collection/${id}`, {
          method: "DELETE",
        });
        fetchCollections();
      },
    });
  };

  const handleAddFile = (collectionId: number) => {
    setEditingData(null);
    setSelectCollectionId(collectionId);
    setModalOpen(true);
  };

  const handleEditFile = (fileId: number) => {
    for (const collection of videoCollections) {
      const file = collection.files.find((f) => f.id === fileId);
      if (file) {
        setEditingData(file);
        setSelectCollectionId(collection.id);
        setModalOpen(true);
        return;
      }
    }
  };
  const handleDeleteFile = (fileId: number) => {
    confirmDialog({
      message: "¿Eliminar el archivo?",
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      accept: async () => {
        await fetch(`/api/file/${fileId}`, {
          method: "DELETE",
        });
        fetchCollections();
      },
    });
  };

  const handleSaved = () => {
    setModalOpen(false);
    fetchCollections();
  };

  const filesTemplate = (collection: VideoCollection) => {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <Button
            icon="pi pi-plus"
            label="Agregar archivo"
            text
            severity="success"
            onClick={() => handleAddFile(collection.id)}
          />
        </div>

        <DataTable
          value={collection.files}
          size="small"
          responsiveLayout="scroll"
        >
          <Column field="id" header="ID" style={{ width: "4rem" }} />
          <Column field="order" header="Orden" />
          <Column
            field="duration"
            header="Duración (s)"
            body={(row: FileType) => row.duration.toFixed(2)}
          />

          <Column
            header="Tags"
            body={(row: FileType) => tagsTemplate(row.tagIds)}
          />

          <Column
            header="Editar"
            body={(row: FileType) => (
              <Button
                icon="pi pi-pencil"
                text
                severity="warning"
                onClick={() => handleEditFile(row.id)}
              />
            )}
          />

          <Column
            header="Eliminar"
            body={(row: FileType) => (
              <Button
                icon="pi pi-trash"
                text
                severity="danger"
                onClick={() => handleDeleteFile(row.id)}
              />
            )}
          />
        </DataTable>
      </div>
    );
  };

  const handleOpenFolder = (id: number) => {
    router.push("gallery/" + id);
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-md">
      <Dialog
        header={editingData ? "Editar archivo" : "Nuevo archivo"}
        visible={modalOpen}
        style={{ width: "30rem" }}
        modal
        onHide={() => setModalOpen(false)}
      >
        <GalleryForm
          initialData={editingData || undefined}
          selectCollectionId={selectCollectionId}
          onCloseModal={handleSaved}
        />
      </Dialog>

      <DataTable
        value={videoCollections}
        loading={isLoading}
        expandedRows={expandedRows}
        onRowToggle={(e) => setExpandedRows(e.data)}
        rowExpansionTemplate={filesTemplate}
        dataKey="id"
        responsiveLayout="scroll"
      >
        <Column expander style={{ width: "3rem" }} />

        <Column field="id" header="ID" style={{ width: "4rem" }} />
        <Column field="name" header="Nombre" />
        <Column field="project.name" header="Proyecto" />

        <Column
          field="date"
          header="Fecha"
          body={(row: VideoCollection) =>
            new Date(row.date).toLocaleDateString()
          }
        />

        <Column
          header="Tags"
          body={(row: VideoCollection) => tagsTemplate(row.tagIds)}
        />
        <Column
          header="Ingresar"
          body={(row: FileType) => (
            <Button
              icon="pi pi-folder-open"
              text
              severity="warning"
              onClick={() => handleOpenFolder(row.id)}
            />
          )}
        />

        <Column
          header="Editar"
          body={(row: VideoCollection) => (
            <Button icon="pi pi-pencil" text onClick={() => onEdit?.(row)} />
          )}
        />
        <Column
          header="Eliminar"
          body={(row: VideoCollection) => (
            <Button
              icon="pi pi-trash"
              text
              severity="danger"
              onClick={() => handleDeleteCollection(row.id)}
            />
          )}
        />
      </DataTable>

      <ConfirmDialog />
    </div>
  );
}
