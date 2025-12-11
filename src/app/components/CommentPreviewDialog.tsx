"use client";
import React, { useState, useRef, useEffect } from "react";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "@prisma/client";
import { useSignedUrlForKey } from "@/hooks/useSignedUrlForKey";

interface PointMarkerWithReplies {
  id: number;
  comment: string;
  urlFile?: string | null;

  tags: Tag[];
  replies?: PointMarkerWithReplies[];
}

interface CommentPreviewDialogProps {
  tags: Tag[];
  defaultTags: Tag[];

  visible: boolean;
  pointMarker: any | null; // ahora pasamos solo el id para cargar datos
  onHide: () => void;
  onSubmitReply: (
    comment: string,
    file: File | null,
    tags: number[],
    parentId: number,
  ) => Promise<void>;
  getSignedUrlForReply?: (key: string) => Promise<string>;
}

const CommentPreviewDialog: React.FC<CommentPreviewDialogProps> = ({
  visible,
  pointMarker,
  onHide,
  onSubmitReply,
  getSignedUrlForReply,
  tags,
  defaultTags,
}) => {
  const [comment, setComment] = useState<PointMarkerWithReplies | null>(null);

  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [replyTags, setReplyTags] = useState<number[]>([]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewReplyFileKey, setPreviewReplyFileKey] = useState<string | null>(
    null,
  );

  const toast = useRef<Toast>(null);

  // Cargar comment + replies cuando cambie el pointMarkerId o visible
  useEffect(() => {
    if (!visible || pointMarker === null) {
      setComment(null);
      return;
    }

    // Cargar el comment con replies desde API (simulado con fetch)
    fetch(`/api/point-marker/${pointMarker.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error cargando comment");
        return res.json();
      })
      .then((data: PointMarkerWithReplies) => {
        console.log(data);
        setComment(data);
      })
      .catch((err) => {
        console.error(err);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "No se pudo cargar el comentario.",
        });
      });
  }, [pointMarker, visible]);

  const signedUrl = useSignedUrlForKey(comment?.urlFile ?? null);
  const previewReplySignedUrl = useSignedUrlForKey(previewReplyFileKey);

  useEffect(() => {
    if (previewReplySignedUrl) {
      setPreviewUrl(previewReplySignedUrl);
    }
  }, [previewReplySignedUrl]);

  useEffect(() => {
    if (!visible) {
      setReplyText("");
      setReplyFile(null);
      setReplyTags([]);
      setPreviewUrl(null);
      setPreviewReplyFileKey(null);
    }
  }, [visible, pointMarker]);
  useEffect(() => {
    if (visible) {
      setReplyTags(defaultTags.map((t) => t.id));
    }
  }, [visible, defaultTags]);
  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Texto vacío",
        detail: "Debes escribir algo para responder.",
      });
      return;
    }

    if (!comment) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No hay comentario seleccionado para responder.",
      });
      return;
    }

    try {
      await onSubmitReply(replyText, replyFile, replyTags, comment.id);
      setReplyText("");
      setReplyFile(null);
      setReplyTags([]);

      // Recargar el comment para mostrar la nueva respuesta
      fetch(`/api/pointMarker/${comment.id}`)
        .then((res) => res.json())
        .then((data: PointMarkerWithReplies) => setComment(data));

      toast.current?.show({
        severity: "success",
        summary: "Respuesta enviada",
        detail: "Tu respuesta fue enviada correctamente.",
      });
    } catch (error) {
      console.error("Error enviando respuesta:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo enviar la respuesta.",
      });
    }
  };

  const handlePreviewReplyFile = async (fileKeyOrUrl: string) => {
    try {
      if (getSignedUrlForReply) {
        const url = await getSignedUrlForReply(fileKeyOrUrl);
        setPreviewUrl(url);
        setPreviewReplyFileKey(null);
        return;
      }
      setPreviewReplyFileKey(fileKeyOrUrl);
    } catch (err) {
      console.error("Error generando signed url para reply:", err);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo obtener la vista previa del archivo.",
      });
    }
  };

  return (
    <Dialog
      header={
        <div className="flex flex-col">
          <span className="text-base font-semibold">
            Vista previa del Marcador
          </span>
          {comment?.id && (
            <span className="text-xs text-gray-500">ID: #{comment.id}</span>
          )}
        </div>
      }
      visible={visible}
      style={{ width: "48rem", maxHeight: "80vh" }}
      onHide={onHide}
      modal
      breakpoints={{ "640px": "95vw" }}
      className="p-dialog-scrollable"
    >
      <Toast ref={toast} />
      <div className="flex flex-col gap-5 p-1 max-h-[65vh] overflow-auto">
        {/* Comentario principal */}
        <div className="p-4 bg-gray-50 rounded-lg shadow-inner text-sm max-h-36 overflow-auto">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {comment?.comment}
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {comment?.tags?.map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: `#${tag.color}` || "black" }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        {signedUrl && (
          <div className="flex justify-center">
            <iframe
              src={signedUrl}
              className="border rounded shadow-md"
              style={{ width: "100%", height: "300px", maxWidth: "450px" }}
              title="Vista previa PDF"
            />
          </div>
        )}

        {/* Vista previa dinámica para archivo de respuesta */}
        {previewUrl && (
          <div className="flex justify-center">
            <div style={{ width: "100%", maxWidth: 600 }}>
              <div className="text-xs text-gray-600 mb-2">
                Vista previa del archivo
              </div>
              <iframe
                src={previewUrl}
                className="border rounded shadow-md"
                style={{ width: "100%", height: "420px" }}
                title="Preview archivo"
              />
              <div className="flex justify-end mt-2">
                <Button
                  label="Cerrar vista previa"
                  icon="pi pi-times"
                  className="p-button-secondary"
                  onClick={() => {
                    setPreviewUrl(null);
                    setPreviewReplyFileKey(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {comment?.replies && comment.replies.length > 0 && (
          <div className="p-3 bg-white border rounded-lg shadow-sm max-h-48 overflow-auto">
            <h4 className="text-sm font-semibold mb-3">Respuestas</h4>

            {comment.replies.map((reply) => (
              <div
                key={reply.id}
                className="mb-3 p-2 border-l-4 border-blue-400 bg-blue-50 rounded text-xs"
              >
                <p className="text-gray-700 whitespace-pre-wrap">
                  {reply.comment}
                </p>

                {/* Mostrar tags en cada reply */}
                <div className="mt-1 flex gap-2 flex-wrap">
                  {reply.tags?.map((tag) => (
                    <span
                      key={tag.id}
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: `#${tag.color}` || "black" }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                {reply?.urlFile && (
                  <div className="mt-1 flex items-center gap-2">
                    <a
                      href="#"
                      className="text-blue-600 text-xs underline"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePreviewReplyFile(reply.urlFile!);
                      }}
                    >
                      📎 Ver archivo adjunto
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formulario para responder */}
        <div className="flex flex-col gap-3 pt-2">
          <InputTextarea
            rows={1}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escribe tu respuesta..."
            className="text-sm"
          />

          <MultiSelect
            value={replyTags}
            options={tags.map((tag) => ({
              label: tag.name,
              value: tag.id,
              style: {
                backgroundColor: tag.color || undefined,
                color: "white",
              },
            }))}
            onChange={(e) => setReplyTags(e.value)}
            placeholder="Selecciona etiquetas"
            className="!w-full"
            display="chip"
            maxSelectedLabels={3}
            filter
          />

          <input
            type="file"
            id="reply-file"
            className="hidden"
            accept="application/pdf"
            onChange={(e) => setReplyFile(e.target.files?.[0] ?? null)}
          />

          <Button
            icon={replyFile ? "pi pi-check" : "pi pi-paperclip"}
            label={
              replyFile ? "Archivo seleccionado" : "Adjuntar archivo (PDF)"
            }
            severity={replyFile ? "success" : "secondary"}
            outlined
            onClick={() => document.getElementById("reply-file")?.click()}
          />

          <div className="flex gap-2">
            <Button
              icon="pi pi-send"
              label="Enviar respuesta"
              onClick={handleSubmitReply}
            />
            <Button
              label="Cerrar"
              icon="pi pi-times"
              severity="secondary"
              text
              onClick={onHide}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default CommentPreviewDialog;
