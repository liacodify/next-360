"use client";

import { useEffect, useState, useRef } from "react";
import { useFormik } from "formik";
import { z } from "zod";
import { FileUpload } from "primereact/fileupload";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Toast } from "primereact/toast";
import { InputNumber } from "primereact/inputnumber";
import { uploadFileDirectlyToS3 } from "../lib/uploadToS3";

const videoSchema = z.object({
  file: z
    .instanceof(File, { message: "Debe seleccionar un archivo válido" })
    .optional(),
  gps: z
    .instanceof(File, { message: "Debe seleccionar un archivo gps válido" })
    .optional(),
  tagIds: z.array(z.number()).optional(),
  order: z.number().min(0),
  id: z.number().optional(),
});

type VideoForm = z.infer<typeof videoSchema>;

type Props = {
  initialData?: Partial<VideoForm>;
  onCloseModal?: () => void;
  selectCollectionId?: number | null;
};

type Project = { id: number; name: string };
type Tag = { id: number; name: string };

export default function GalleryForm({
  initialData,
  onCloseModal,
  selectCollectionId,
}: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    async function fetchProjects() {
      const res = await fetch("/api/project");
      if (res.ok) setProjects(await res.json());
    }

    async function fetchTags() {
      const res = await fetch("/api/tag");
      if (res.ok) setTags(await res.json());
    }

    fetchProjects();
    fetchTags();
  }, []);

  const formik = useFormik<VideoForm>({
    initialValues: {
      file: undefined,
      gps: undefined,
      tagIds: initialData?.tagIds || [],
      order: initialData?.order ?? 0,
      id: initialData?.id,
    },

    onSubmit: async (values, { setErrors, setSubmitting }) => {
      setSubmitting(true);
      try {
        let fileKey: string | undefined;
        if (values.file) {
          fileKey = await uploadFileDirectlyToS3(values.file, values.file.name);
        }

        let gpsKey: string | undefined;
        if (values.gps) {
          gpsKey = await uploadFileDirectlyToS3(values.gps, values.gps.name);
        }

        const method = values.id ? "PUT" : "POST";
        const url = "/api/upload";

        const body = {
          id: values.id,
          fileKey,
          gpsKey,
          collectionId: selectCollectionId,
          tagIds: values.tagIds || [],
          order: values.order,
        };

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Error al subir o procesar archivo.",
          );
        }

        toast.current?.show({
          severity: "success",
          summary: "Éxito",
          detail: "Archivo guardado correctamente",
          life: 3000,
        });

        onCloseModal?.();
      } catch (err: any) {
        console.error(err);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: err.message || "Error al subir o procesar archivo.",
          life: 4000,
        });
        setErrors({});
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="flex justify-center w-full h-full">
      <Toast ref={toast} />

      <form
        onSubmit={formik.handleSubmit}
        className="flex flex-col gap-6 bg-white rounded-2xl shadow-xl w-full p-6"
      >
        {/* TAGS */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">Tagss</label>
          <MultiSelect
            value={formik.values.tagIds}
            options={tags.map((tag) => ({
              label: tag.name,
              value: tag.id,
            }))}
            onChange={(e) => formik.setFieldValue("tagIds", e.value)}
            placeholder="Selecciona los tags"
            display="chip"
            className="w-full"
          />
        </div>

        {/* ORDER */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">
            Orden en la colección
          </label>

          <InputNumber
            value={formik.values.order}
            onValueChange={(e) => formik.setFieldValue("order", e.value ?? 0)}
            min={0}
            showButtons
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">Archivo MP4</label>
          <FileUpload
            mode="basic"
            accept=".mp4"
            customUpload
            auto
            chooseLabel="Seleccionar Video"
            className="w-full [&>span]:w-full [&>span]:justify-center"
            chooseOptions={{ className: "w-full" }}
            onSelect={(e) => formik.setFieldValue("file", e.files?.[0])}
          />
          {formik.values.file && (
            <span className="text-sm text-gray-600">
              Seleccionado: <b>{formik.values.file.name}</b>
            </span>
          )}
        </div>

        {/* GPX */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">Archivo GPX</label>
          <FileUpload
            mode="basic"
            accept=".gpx"
            customUpload
            auto
            chooseLabel="Seleccionar Archivo GPX"
            className="w-full [&>span]:w-full [&>span]:justify-center"
            chooseOptions={{ className: "w-full" }}
            onSelect={(e) => formik.setFieldValue("gps", e.files?.[0])}
          />
          {formik.values.gps && (
            <span className="text-sm text-gray-600">
              Seleccionado: <b>{formik.values.gps.name}</b>
            </span>
          )}
        </div>

        <Button
          label={
            formik.isSubmitting
              ? "Enviando..."
              : formik.values.id
                ? "Actualizar"
                : "Guardar"
          }
          type="submit"
          className="w-full"
          disabled={formik.isSubmitting}
          loading={formik.isSubmitting}
        />
      </form>
    </div>
  );
}
