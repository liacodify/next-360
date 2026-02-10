"use client";

import { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import { z } from "zod";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";

/* =========================
   SCHEMA
   ========================= */

const videoCollectionSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "El nombre es obligatorio"),
  projectId: z.number({
    error: "Debe seleccionar un proyecto",
  }),
  date: z.string().min(1, "La fecha es obligatoria"),
  tagIds: z.array(z.number()).optional(),
});

type VideoCollectionForm = z.infer<typeof videoCollectionSchema>;

type Project = {
  id: number;
  name: string;
};

type Tag = {
  id: number;
  name: string;
};

type Props = {
  initialData?: Partial<VideoCollectionForm>;
  onCloseModal?: () => void;
};

/* =========================
   COMPONENT
   ========================= */

export default function VideoCollectionForm({
  initialData,
  onCloseModal,
}: Props) {
  const toast = useRef<Toast>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  /* =========================
     FETCH DATA
     ========================= */

  useEffect(() => {
    async function fetchData() {
      const [projectRes, tagRes] = await Promise.all([
        fetch("/api/project"),
        fetch("/api/tag"),
      ]);

      if (projectRes.ok) {
        setProjects(await projectRes.json());
      }

      if (tagRes.ok) {
        setTags(await tagRes.json());
      }
    }

    fetchData();
  }, []);

  /* =========================
     FORMIK
     ========================= */

  const formik = useFormik<VideoCollectionForm>({
    initialValues: {
      id: initialData?.id,
      name: initialData?.name || "",
      projectId: initialData?.projectId || 0,
      date: initialData?.date || "",
      tagIds: initialData?.tagIds || [],
    },

    validate: (values) => {
      const result = videoCollectionSchema.safeParse(values);
      if (result.success) return {};
      return result.error.flatten().fieldErrors;
    },

    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(true);
      try {
        const isUpdate = Boolean(values.id);
        const method = isUpdate ? "PUT" : "POST";

        const url = isUpdate
          ? `/api/video-collection/${values.id}`
          : "/api/video-collection";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            projectId: values.projectId,
            date: values.date,
            tagIds: values.tagIds || [],
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Error al guardar la colección");
        }

        toast.current?.show({
          severity: "success",
          summary: "Éxito",
          detail: isUpdate
            ? "Video collection actualizada"
            : "Video collection creada",
          life: 3000,
        });

        onCloseModal?.();
      } catch (err: any) {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: err.message || "Error inesperado",
          life: 4000,
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="flex justify-center w-full">
      <Toast ref={toast} />

      <form
        onSubmit={formik.handleSubmit}
        className="flex flex-col gap-5 bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
      >
        {/* Proyecto */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">Proyecto</label>
          <Dropdown
            value={formik.values.projectId}
            options={projects.map((p) => ({
              label: p.name,
              value: p.id,
            }))}
            placeholder="Selecciona un proyecto"
            className="w-full"
            onChange={(e) => formik.setFieldValue("projectId", e.value)}
          />
          {formik.errors.projectId && (
            <small className="text-red-500">{formik.errors.projectId}</small>
          )}
        </div>

        {/* Nombre */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">Nombre</label>
          <InputText
            value={formik.values.name}
            onChange={(e) => formik.setFieldValue("name", e.target.value)}
            className="w-full"
            placeholder="Ej: Ruta mañana"
          />
          {formik.errors.name && (
            <small className="text-red-500">{formik.errors.name}</small>
          )}
        </div>

        {/* Fecha */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">Fecha del video</label>
          <InputText
            type="date"
            value={formik.values.date}
            onChange={(e) => formik.setFieldValue("date", e.target.value)}
            className="w-full"
          />
          {formik.errors.date && (
            <small className="text-red-500">{formik.errors.date}</small>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">Tags</label>
          <MultiSelect
            value={formik.values.tagIds}
            options={tags.map((tag) => ({
              label: tag.name,
              value: tag.id,
            }))}
            onChange={(e) => formik.setFieldValue("tagIds", e.value)}
            placeholder="Selecciona tags"
            display="chip"
            className="w-full"
          />
        </div>

        <Button
          type="submit"
          label={
            formik.isSubmitting
              ? "Guardando..."
              : formik.values.id
                ? "Actualizar"
                : "Crear colección"
          }
          loading={formik.isSubmitting}
          disabled={formik.isSubmitting}
          className="w-full"
        />
      </form>
    </div>
  );
}
