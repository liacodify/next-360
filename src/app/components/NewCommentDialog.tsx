"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { MultiSelect } from "primereact/multiselect";
import { Dropdown } from "primereact/dropdown";

interface Marker {
  id: number;
  name: string;
  icon: string;
}

interface Tag {
  id: number;
  name: string;
}

interface NewCommentDialogProps {
  visible: boolean;
  newPosition: [number, number] | null;
  onHide: () => void;
  onSubmit: (data: {
    comment: string;
    file: File | null;
    tags: number[];
    marker: Marker | null;
  }) => Promise<void>;
  tags: Tag[];
  defaultTags: Tag[];
}

const markerItemTemplate = (option: Marker) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <img
      src={option.icon}
      alt={option.name}
      style={{ width: 24, height: 24 }}
    />
    <span>{option.name}</span>
  </div>
);

const selectedMarkerTemplate = (option: Marker | null) => {
  if (!option) return <span>Selecciona un marcador</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <img
        src={option.icon}
        alt={option.name}
        style={{ width: 24, height: 24 }}
      />
      <span>{option.name}</span>
    </div>
  );
};

const NewCommentDialog: React.FC<NewCommentDialogProps> = ({
  tags,
  defaultTags,
  newPosition,
  visible,
  onHide,
  onSubmit,
}) => {
  const [commentText, setCommentText] = useState("");
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const toast = useRef<Toast>(null);

  // Cargar marcadores desde API con fetch
  useEffect(() => {
    async function fetchMarkers() {
      try {
        const res = await fetch("/api/marker");
        if (!res.ok) throw new Error("Error cargando marcadores");
        const data: Marker[] = await res.json();
        setMarkers(data);
      } catch (error) {
        console.error("Error fetching markers:", error);
      }
    }

    fetchMarkers();
  }, []);

  useEffect(() => {
    if (visible) {
      setSelectedTags(defaultTags.map((e) => e.id));
    }
  }, [visible, defaultTags]);

  const handleSubmit = async () => {
    if (!commentText.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "El comentario está vacío",
      });
      return;
    }

    await onSubmit({
      comment: commentText,
      file: commentFile,
      tags: selectedTags,
      marker: selectedMarker,
    });

    setCommentText("");
    setCommentFile(null);
    setSelectedTags([]);
    setSelectedMarker(null);
  };

  const handleHide = () => {
    setCommentText("");
    setCommentFile(null);
    setSelectedTags(defaultTags.map((e) => e.id));
    setSelectedMarker(null);
    onHide();
  };

  return (
    <Dialog
      header="Nuevo Marcador"
      visible={visible}
      footer={() => (
        <div className="flex justify-end gap-2 pt-2">
          <Button
            label="Cancelar"
            icon="pi pi-times"
            onClick={handleHide}
            outlined
          />
          <Button label="Enviar" icon="pi pi-send" onClick={handleSubmit} />
        </div>
      )}
      style={{ width: "32rem" }}
      onHide={handleHide}
      modal
      blockScroll
      className="p-fluid"
    >
      <Toast ref={toast} />

      <div className="surface-card p-2 rounded-lg border-1 border-gray-200 flex flex-col gap-4 shadow-1">
        {newPosition && (
          <div className="text-sm text-gray-500 mb-3">
            <span className="font-medium">Lat:</span> {newPosition[0]} —{" "}
            <span className="font-medium">Lon:</span> {newPosition[1]}
          </div>
        )}

        <InputTextarea
          rows={3}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Escribe tu comentario..."
          className="w-full"
          autoResize
        />

        <div>
          <label className="text-sm font-medium mb-1 block">Tags</label>
          <MultiSelect
            value={selectedTags}
            options={tags}
            onChange={(e) => setSelectedTags(e.value)}
            optionLabel="name"
            optionValue="id"
            placeholder="Selecciona tags"
            display="chip"
            className="!w-full"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Marcador</label>
          <Dropdown
            value={selectedMarker}
            options={markers}
            onChange={(e) => setSelectedMarker(e.value)}
            optionLabel="name"
            placeholder="Selecciona un marcador"
            showClear
            itemTemplate={markerItemTemplate}
            valueTemplate={selectedMarkerTemplate}
            className="!w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="file"
            id="new-comment-file"
            className="hidden"
            accept="application/pdf"
            onChange={(e) => setCommentFile(e.target.files?.[0] ?? null)}
          />

          <Button
            icon={commentFile ? "pi pi-check" : "pi pi-paperclip"}
            label={commentFile ? "Archivo listo" : "Adjuntar archivo (PDF)"}
            severity={commentFile ? "success" : "secondary"}
            onClick={() => document.getElementById("new-comment-file")?.click()}
            outlined
          />
        </div>
      </div>
    </Dialog>
  );
};

export default NewCommentDialog;
