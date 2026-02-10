"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { MultiSelect } from "primereact/multiselect";

import { PointMarker, Marker } from "@prisma/client";
import { Tooltip } from "primereact/tooltip";

interface Tag {
  id: number;
  name: string;
  color?: string | null;
}

interface PointMarkerWithMarker extends PointMarker {
  marker?: Marker | null;
  tags?: Tag[];
  parent?: PointMarkerWithMarker | null;
}

interface Props {
  projectId: number;
}

export default function PointMarkersManager({ projectId }: Props) {
  const toast = React.useRef<Toast>(null);

  const [points, setPoints] = useState<PointMarkerWithMarker[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const [selectedMarkerFilter, setSelectedMarkerFilter] = useState<number[]>(
    [],
  );
  const [selectedPoints, setSelectedPoints] = useState<PointMarkerWithMarker[]>(
    [],
  );

  const [form, setForm] = useState({
    id: 0,
    lat: "",
    lon: "",
    comment: "",
    markerId: "",
    parentId: null as number | null,
    tagIds: [] as number[],
  });

  // -------------------------------------
  // LOAD DATA
  // -------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [pointsRes, markersRes, tagsRes] = await Promise.all([
        fetch(`/api/point-marker?projectId=${projectId}`),
        fetch(`/api/marker`),
        fetch(`/api/tag`),
      ]);

      const pointsData = await pointsRes.json();
      const markersData = await markersRes.json();
      const tagsData = await tagsRes.json();

      setPoints(pointsData);
      setMarkers(markersData);
      setAllTags(tagsData);

      // Inicializar filtro con todos los marker IDs al cargar datos para evitar efecto extra
      setSelectedMarkerFilter(markersData.map((m: Marker) => m.id));
      setSelectedPoints([]); // limpiar selección al recargar datos
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------
  // FILTRADO MEMORIZADO DE PUNTOS SEGÚN MARKERS SELECCIONADOS
  // -------------------------------------
  const filteredPoints = useMemo(() => {
    if (selectedMarkerFilter.length === 0) return []; // cambia aquí para que no muestre nada
    return points.filter(
      (p) => p.markerId && selectedMarkerFilter.includes(p.markerId),
    );
  }, [points, selectedMarkerFilter]);

  // -------------------------------------
  // FUNCIONES MEMORIZADAS PARA RENDERS
  // -------------------------------------
  const openCreate = useCallback(() => {
    setEditing(false);
    setForm({
      id: 0,
      lat: "",
      lon: "",
      comment: "",
      markerId: "",
      parentId: null,
      tagIds: [],
    });
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: PointMarkerWithMarker) => {
    setEditing(true);
    setForm({
      id: row.id,
      lat: row.lat?.toString() || "",
      lon: row.lon?.toString() || "",
      comment: row.comment,
      markerId: row.markerId?.toString() || "",
      parentId: row.parentId || null,
      tagIds: row.tags ? row.tags.map((t) => t.id) : [],
    });
    setModalOpen(true);
  }, []);

  const deletePoint = useCallback(
    async (row: PointMarkerWithMarker) => {
      if (!confirm("¿Eliminar el point marker?")) return;

      const res = await fetch(`/api/point-marker?id=${row.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.current?.show({ severity: "success", summary: "Eliminado" });
        loadData();
        setSelectedPoints((prev) => prev.filter((p) => p.id !== row.id));
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error al eliminar",
        });
      }
    },
    [loadData],
  );

  const savePoint = useCallback(async () => {
    const data = {
      id: editing ? form.id : undefined,
      lat: Number(form.lat),
      lon: Number(form.lon),
      comment: form.comment,
      markerId: form.markerId ? Number(form.markerId) : null,
      parentId: form.parentId,
      tagIds: form.tagIds,
      projectId,
      createdById: 1,
    };

    const method = editing ? "PUT" : "POST";

    const res = await fetch("/api/point-marker", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.current?.show({ severity: "success", summary: "Guardado" });
      setModalOpen(false);
      loadData();
    } else {
      toast.current?.show({ severity: "error", summary: "Error al guardar" });
    }
  }, [editing, form, projectId, loadData]);

  // -------------------------------------
  // EXPORT CSV MEMORIZADO
  // -------------------------------------
  const exportCSV = useCallback(() => {
    const rows = (selectedPoints.length ? selectedPoints : filteredPoints).map(
      (p) => ({
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        comment: p.comment,
        markerId: p.markerId,
        marker: p.marker?.name,
        parentId: p.parentId,
        metrado: p.referenceMeter,
        tags: p.tags?.map((t) => t.name).join(";") || "",
      }),
    );

    if (rows.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "No hay datos para exportar",
      });
      return;
    }

    const escapeCSV = (value: any) => {
      if (value == null) return "";
      let str = String(value);
      if (str.includes('"')) str = str.replace(/"/g, '""');
      if (/[",\n\r]/.test(str)) str = `"${str}"`;
      return str;
    };

    const header = Object.keys(rows[0]).join(",");
    const csv = [
      header,
      ...rows.map((r) => Object.values(r).map(escapeCSV).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `project_${projectId}_pointmarkers.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }, [selectedPoints, filteredPoints, projectId]);

  // -------------------------------------
  // IMPORT CSV
  // -------------------------------------
  const importCSV = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.trim().split("\n");

        if (lines.length < 2) {
          toast.current?.show({
            severity: "warn",
            summary: "Archivo CSV vacío",
          });
          return;
        }

        const rows = lines.slice(1).map((line) => {
          const [lat, lon, comment, markerId, parentId, tags] = line.split(",");
          return { lat, lon, comment, markerId, parentId, tags };
        });

        for (const row of rows) {
          const tagNames = row.tags
            ? row.tags.split(";").map((t) => t.trim())
            : [];
          const tagIds = allTags
            .filter((t) => tagNames.includes(t.name))
            .map((t) => t.id);

          try {
            await fetch("/api/point-marker", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lat: Number(row.lat),
                lon: Number(row.lon),
                comment: row.comment,
                markerId: Number(row.markerId) || null,
                parentId: Number(row.parentId) || null,
                tagIds,
                projectId,
                createdById: 1,
              }),
            });
          } catch (error) {
            console.error("Error importando fila:", row, error);
          }
        }

        toast.current?.show({ severity: "success", summary: "Importado" });
        loadData();
      };

      reader.readAsText(file);
      e.target.value = "";
    },
    [allTags, projectId, loadData],
  );

  // -------------------------------------
  // RENDER ACTION TEMPLATE
  // -------------------------------------
  const actionTemplate = useCallback(
    (row: PointMarkerWithMarker) => (
      <div className="flex gap-2">
        <Button
          icon="pi pi-pencil"
          text
          rounded
          onClick={() => openEdit(row)}
        />
        <Button
          icon="pi pi-trash"
          text
          rounded
          severity="danger"
          onClick={() => deletePoint(row)}
        />
      </div>
    ),
    [openEdit, deletePoint],
  );

  return (
    <div className="card p-3">
      <Toast ref={toast} />

      {/* --- MULTISELECT FILTRO MARKERS --- */}
      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="markerFilter" className="font-semibold">
          Filtrar por Marcadores:
        </label>

        <MultiSelect
          id="markerFilter"
          value={selectedMarkerFilter}
          options={markers}
          onChange={(e) => {
            setSelectedMarkerFilter(e.value);
            setSelectedPoints([]);
          }}
          optionLabel="name"
          optionValue="id"
          placeholder="Seleccione markers"
          className="!w-full"
          display="chip"
        />
        <Button
          icon="pi pi-times"
          className=" p-button-sm"
          aria-label="Limpiar filtro"
          onClick={() => {
            setSelectedMarkerFilter([]);
            setSelectedPoints([]);
          }}
        />
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold">Marcadores generados</h2>

        <div className="flex gap-2">
          <Button label="Nuevo" icon="pi pi-plus" onClick={openCreate} />
          <Button
            id="exportCSVBtn"
            label="Exportar CSV"
            icon="pi pi-download"
            onClick={exportCSV}
            disabled={selectedPoints.length === 0}
          />

          <Button
            label="Importar CSV"
            icon="pi pi-upload"
            onClick={() => document.getElementById("csvInput")?.click()}
          />
          <input
            id="csvInput"
            type="file"
            accept=".csv"
            hidden
            onChange={importCSV}
          />
        </div>
      </div>

      <DataTable
        value={filteredPoints}
        loading={loading}
        stripedRows
        size="small"
        selection={selectedPoints}
        onSelectionChange={(e) => setSelectedPoints(e.value)}
        dataKey="id"
        selectionMode="checkbox"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 20]}
      >
        <Column selectionMode="multiple" style={{ width: "3em" }} />
        <Column field="id" header="ID" style={{ width: "80px" }} />
        <Column field="lat" header="Lat" />
        <Column field="lon" header="Lon" />
        <Column field="comment" header="Comentario" />
        <Column header="Marker" body={(row) => row.marker?.name || "-"} />
        <Column
          header="Tags"
          body={(row: any) =>
            row.tags?.map((tag: any) => (
              <span
                key={tag.id}
                style={{
                  backgroundColor: `#${tag.color}` || "#777",
                  color: "#fff",

                  padding: "2px 6px",
                  borderRadius: "4px",
                  marginRight: "4px",
                  fontSize: "0.8rem",
                }}
              >
                {tag.name}
              </span>
            ))
          }
        />
        <Column
          header="Padre"
          body={(row) =>
            row.parent ? row.parent.comment || `ID ${row.parent.id}` : "-"
          }
        />
        <Column
          header="Acciones"
          body={actionTemplate}
          style={{ width: "8rem" }}
        />
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

          <select
            className="p-inputtext p-component"
            value={form.parentId || ""}
            onChange={(e) =>
              setForm({
                ...form,
                parentId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Sin padre</option>
            {points
              .filter((p) => p.id !== form.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.comment || `ID ${p.id}`}
                </option>
              ))}
          </select>

          <select
            multiple
            className="p-inputtext p-component"
            value={form.tagIds.map(String)}
            onChange={(e) => {
              const options = e.target.options;
              const selected: number[] = [];
              for (let i = 0; i < options.length; i++) {
                if (options[i].selected)
                  selected.push(Number(options[i].value));
              }
              setForm({ ...form, tagIds: selected });
            }}
            style={{ height: "8rem" }}
          >
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>

          <Button label="Guardar" className="w-full" onClick={savePoint} />
        </div>
      </Dialog>
    </div>
  );
}
