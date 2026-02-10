"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { AutoComplete } from "primereact/autocomplete";
import { Tag } from "primereact/tag";
import PointTemplate from "@/app/components/PointTemplate";
import { formatDistance } from "@/app/utis/formatDistance";
import CommentPreviewDialog from "@/app/components/CommentPreviewDialog";
import NewCommentDialog from "@/app/components/NewCommentDialog";
import { uploadFileDirectlyToS3 } from "@/app/lib/uploadToS3";
import SidebarLegend from "@/app/components/SidebarLegend";
import { FullPageLoading } from "@/app/components/FullPageLoading";
import Video360Section from "@/app/components/Video360";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  File as IFile,
  GpsPoint,
  PointMarker,
  Project,
  Tag as Itag,
  ProjectLocation,
  VideoCollection,
} from "@prisma/client";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { Splitter, SplitterPanel } from "primereact/splitter";

const GpsMap = dynamic(() => import("@/app/components/GpsMap"), {
  ssr: false,
});

export type FileResponse = VideoCollection & {
  files: (IFile & { gpsPoints: GpsPoint[] })[];
  project:
    | (Project & {
        PointMarker: (PointMarker & {
          marker: any;
        })[];
        locations: ProjectLocation[];
      })
    | null;
  tags: Itag[];
};

export default function GalleryPreviewPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const videoCollecionId = useMemo(
    () => (params.id ? Number(params.id) : null),
    [params.id],
  );
  const queryClient = useQueryClient();

  const [currentTime, onSelectPoint] = useState<{
    second: number;
    fileId: number;
    fileIndex: number;
  }>({
    second: 0,
    fileId: 0,
    fileIndex: 0,
  });

  const [startKm, setStartKm] = useState(0);
  const [search, setSearch] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<GpsPoint[]>(
    [],
  );
  const [selectedLegendPoint, setSelectedLegendPoint] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [visibleGroups, setVisibleGroups] = useState<Record<number, boolean>>(
    {},
  );

  const [visibleTags, setVisibleTags] = useState<Record<number, boolean>>({});
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
  const [openNewCommentDialog, setOpenNewCommentDialog] = useState(false);
  const [selectComment, setSelectComment] = useState<any | null>(null);

  const [newPosition, setNewPosition] = useState<
    [number, number, number] | null
  >(null);
  const [visible, setVisible] = useState(false);

  const fileQuery = useQuery<FileResponse, Error>({
    queryKey: ["file", videoCollecionId],
    queryFn: async () => {
      if (!videoCollecionId) throw new Error("ID de archivo inválido");
      const res = await fetch(`/api/video-collection/${videoCollecionId}`);
      if (!res.ok) throw new Error("Error al obtener archivo");
      return res.json();
    },
    enabled: !!videoCollecionId,
  });

  const tagsQuery = useQuery<Itag[], Error>({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch("/api/tag");
      if (!res.ok) throw new Error("Error al obtener tags");
      return res.json();
    },
  });

  const files = useMemo(() => {
    return fileQuery.data?.files ?? [];
  }, [fileQuery.data?.files]);

  const selectedFile = useMemo(() => {
    return files[currentTime.fileIndex];
  }, [files, currentTime.fileIndex]);

  const videoKey = useMemo(() => {
    return `video-${selectedFile?.id || 0}`;
  }, [selectedFile?.id]);

  useEffect(() => {
    if (
      tagsQuery.data &&
      tagsQuery.data.length > 0 &&
      Object.keys(visibleTags).length === 0
    ) {
      setVisibleTags(
        Object.fromEntries(tagsQuery.data.map((tag) => [tag.id, true])),
      );
    }
  }, [tagsQuery.data, visibleTags]);

  const searchPoints = useCallback(
    (e: { query: string }) => {
      if (!selectedFile?.gpsPoints) return;
      const query = e.query.trim().toLowerCase();
      const results = selectedFile.gpsPoints.filter((p) => {
        const dist = startKm + p.totalDistance;
        return formatDistance(dist).toLowerCase().includes(query);
      });
      setFilteredSuggestions(results.slice(0, 30));
    },
    [selectedFile?.gpsPoints, startKm],
  );

  const handleSelectLegendPoint = useCallback(
    (pos: { lat: number; lon: number }) => {
      setSelectedLegendPoint(pos);
    },
    [],
  );

  const [kmDistance, setKmDistance] = useState<number | "">("");
  const [mDistance, setMDistance] = useState<number | "">("");

  const haversineMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371000;
    const toRad = (x: number) => (x * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
  };

  const handleSearchClick = useCallback(() => {
    if (!fileQuery.data?.project?.locations?.length || !files.length) {
      return;
    }

    // 1️⃣ km + m → meter absoluto
    const targetMeter = Number(kmDistance || 0) * 1000 + Number(mDistance || 0);

    // 2️⃣ buscar ProjectLocation más cercano por meter
    const locations = fileQuery.data.project.locations;

    let closestLocation = locations[0];
    let minDiff = Math.abs((locations[0].meter ?? 0) - targetMeter);

    for (const loc of locations) {
      const diff = Math.abs((loc.meter ?? 0) - targetMeter);
      if (diff < minDiff) {
        minDiff = diff;
        closestLocation = loc;
      }
    }

    // 3️⃣ juntar TODOS los gps points (todos los videos)
    const allGpsPoints = files.flatMap((file, fileIndex) =>
      file.gpsPoints.map((p) => ({
        ...p,
        fileId: file.id,
        fileIndex,
      })),
    );

    if (!allGpsPoints.length) return;

    // 4️⃣ buscar GPS point más cercano al project location
    let closestGpsPoint = allGpsPoints[0];
    let minDistance = haversineMeters(
      closestLocation.lat,
      closestLocation.lon,
      closestGpsPoint.lat,
      closestGpsPoint.lon,
    );

    for (const p of allGpsPoints) {
      const dist = haversineMeters(
        closestLocation.lat,
        closestLocation.lon,
        p.lat,
        p.lon,
      );

      if (dist < minDistance) {
        minDistance = dist;
        closestGpsPoint = p;
      }
    }

    // 5️⃣ sincronizar video + mapa
    onSelectPoint({
      second: closestGpsPoint.second,
      fileId: closestGpsPoint.fileId,
      fileIndex: closestGpsPoint.fileIndex,
    });
  }, [
    kmDistance,
    mDistance,
    fileQuery.data?.project?.locations,
    files,
    onSelectPoint,
  ]);

  const pointsMarkers = useMemo(() => {
    return fileQuery.data?.project?.PointMarker ?? [];
  }, [fileQuery.data?.project?.PointMarker]);

  const handleVideoEnd = useCallback(() => {
    const nextIndex = currentTime.fileIndex + 1;

    if (nextIndex < files.length) {
      console.log(`Auto-avanzando al video ${nextIndex + 1}/${files.length}`);

      onSelectPoint({
        second: 0, // Empezar desde el inicio del siguiente video
        fileId: files[nextIndex].id,
        fileIndex: nextIndex,
      });
    } else {
      console.log("Ya es el último video, permaneciendo aquí");
    }
  }, [currentTime.fileIndex, files]);

  // 🎮 Navegación manual (opcional)
  const goToPreviousVideo = useCallback(() => {
    if (currentTime.fileIndex > 0) {
      const prevIndex = currentTime.fileIndex - 1;
      onSelectPoint({
        second: 0,
        fileId: files[prevIndex].id,
        fileIndex: prevIndex,
      });
    }
  }, [currentTime.fileIndex, files]);

  const goToNextVideo = useCallback(() => {
    if (currentTime.fileIndex < files.length - 1) {
      handleVideoEnd(); // Reutilizar la misma lógica
    }
  }, [currentTime.fileIndex, files.length, handleVideoEnd]);

  // Loading y error states
  if (fileQuery.error)
    return <div>Error cargando archivo: {fileQuery.error.message}</div>;
  if (tagsQuery.error)
    return <div>Error cargando tags: {tagsQuery.error.message}</div>;
  if (fileQuery.isLoading || tagsQuery.isLoading || status === "loading")
    return <FullPageLoading />;
  if (!session) return <div>No estás autenticado</div>;

  return (
    <div className="w-full h-full flex p-2 flex-col">
      <div className="flex flex-1 overflow-hidden w-full">
        <Splitter style={{ height: "100%", width: "100%" }}>
          <SplitterPanel className="w-full flex align-items-center justify-content-center">
            <div className="flex flex-col w-full">
              <Video360Section
                key={videoKey}
                url={selectedFile?.filePath ?? ""}
                onSelectPoint={onSelectPoint}
                currentTime={currentTime}
                points={selectedFile?.gpsPoints ?? []}
                startKm={startKm}
                totalFiles={files.length}
                onVideoEnd={handleVideoEnd}
              />

              <div className="w-full p-3 border-b bg-white flex content-between gap-4 shadow-sm rounded-t item-center items-center">
                <div className="flex content-between">
                  <h2 className="text-base font-bold text-gray-800 leading-tight">
                    {fileQuery.data?.name ?? "Cargando archivo..."}
                  </h2>
                  {files.length > 1 && (
                    <span className="text-xs text-gray-500">
                      Video {currentTime.fileIndex + 1} de {files.length}
                    </span>
                  )}
                </div>
                {files.length > 1 && (
                  <div className="flex gap-2">
                    <Button
                      icon="pi pi-chevron-left"
                      size="small"
                      outlined
                      onClick={goToPreviousVideo}
                      disabled={currentTime.fileIndex === 0}
                      tooltip="Video anterior"
                      tooltipOptions={{ position: "bottom" }}
                    />
                    <Button
                      icon="pi pi-chevron-right"
                      size="small"
                      outlined
                      onClick={goToNextVideo}
                      disabled={currentTime.fileIndex === files.length - 1}
                      tooltip="Video siguiente"
                      tooltipOptions={{ position: "bottom" }}
                    />
                  </div>
                )}

                <div className="w-full flex justify-evenly items-center gap-2">
                  <div>
                    <input
                      type="number"
                      placeholder="km"
                      className="border rounded px-2 py-1 text-sm w-32"
                      value={kmDistance}
                      onChange={(e) =>
                        setKmDistance(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    />
                    +
                    <input
                      type="number"
                      placeholder="m"
                      className="border rounded px-2 py-1 text-sm w-32"
                      value={mDistance}
                      onChange={(e) =>
                        setMDistance(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    />
                  </div>

                  <Button
                    label="Buscar"
                    onClick={handleSearchClick}
                    size="small"
                    disabled={kmDistance === "" && mDistance === ""}
                  />
                </div>
                <div>
                  {fileQuery.data?.tags?.map((tag) => (
                    <Tag
                      key={tag.id}
                      value={tag.name}
                      style={{
                        backgroundColor: `#${tag.color}`,
                        color: "white",
                      }}
                      rounded
                    />
                  ))}
                </div>
              </div>
            </div>
          </SplitterPanel>

          <SplitterPanel className="w-full flex align-items-center justify-content-center">
            <div className="w-full relative bg-white border-l h-full flex flex-col overflow-auto">
              <Sidebar
                style={{ width: "40rem" }}
                header={() => <>Leyenda</>}
                visible={visible}
                onHide={() => setVisible(false)}
              >
                <SidebarLegend
                  tags={tagsQuery.data || []}
                  pointsMarkers={pointsMarkers}
                  onSelectPosition={handleSelectLegendPoint}
                  visibleGroups={visibleGroups}
                  setVisibleGroups={setVisibleGroups}
                  visibleTags={visibleTags}
                  setVisibleTags={setVisibleTags}
                />
              </Sidebar>

              <Button
                style={{
                  zIndex: 1000,
                  position: "absolute",
                  top: 5,
                  right: 5,
                }}
                size="small"
                severity="info"
                icon="pi pi-align-justify"
                onClick={() => setVisible(true)}
              />

              <div className="shadow-lg rounded-xl w-full h-full flex-1 min-h-0">
                <GpsMap
                  newPosition={newPosition}
                  setNewPosition={setNewPosition}
                  visibleGroups={visibleGroups}
                  legend={pointsMarkers}
                  startKm={startKm}
                  onSelectPoint={onSelectPoint}
                  files={files}
                  currentTime={currentTime}
                  selectedPosition={selectedLegendPoint}
                  setOpenPreview={setOpenPreviewDialog}
                  setSelectComment={setSelectComment}
                  setOpenNewCommentDialog={setOpenNewCommentDialog}
                  visibleTags={visibleTags}
                  projectLocations={fileQuery.data?.project?.locations || []}
                />
              </div>
            </div>
          </SplitterPanel>
        </Splitter>

        {/* Diálogos */}
        <CommentPreviewDialog
          visible={openPreviewDialog}
          pointMarker={selectComment}
          tags={tagsQuery.data || []}
          defaultTags={fileQuery.data?.tags || []}
          onHide={() => setOpenPreviewDialog(false)}
          onSubmitReply={async (comment, pdf, tags, parentId) => {
            try {
              let urlFile = null;
              const createdById = Number(session?.user?.id);

              if (pdf) {
                urlFile = await uploadFileDirectlyToS3(pdf, pdf.name);
              }

              const res = await fetch("/api/point-marker/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  parentId,
                  comment,
                  urlFile,
                  createdById,
                  tags,
                }),
              });

              if (!res.ok) throw new Error("Error creando respuesta");

              setOpenPreviewDialog(false);
              queryClient.invalidateQueries({
                queryKey: ["file", videoCollecionId],
              });
            } catch (error) {
              console.error("Error en submit respuesta:", error);
            }
          }}
        />

        <NewCommentDialog
          tags={tagsQuery.data || []}
          defaultTags={fileQuery.data?.tags || []}
          visible={openNewCommentDialog}
          newPosition={newPosition}
          onHide={() => setOpenNewCommentDialog(false)}
          onSubmit={async ({ comment, tags, marker, file: pdf }) => {
            try {
              let urlFile = null;
              const createdById = Number(session?.user?.id);

              if (pdf) {
                urlFile = await uploadFileDirectlyToS3(pdf, pdf.name);
              }

              const res = await fetch("/api/point-marker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  comment,
                  createdById,
                  urlFile,
                  projectId: fileQuery.data?.projectId,
                  markerId: marker?.id,
                  lat: newPosition?.[0],
                  lon: newPosition?.[1],
                  referenceMeter: newPosition?.[2],
                  tags,
                }),
              });

              if (!res.ok) throw new Error("Error creando comentario");

              setOpenNewCommentDialog(false);
              queryClient.invalidateQueries({
                queryKey: ["file", videoCollecionId],
              });
            } catch (error) {
              console.error("Error en submit comentario:", error);
            }
          }}
        />
      </div>
    </div>
  );
}
