"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvent,
  Tooltip,
  useMapEvents,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import DraggablePointer from "./DraggablePointer";
import { GpsPoint, Marker as IMarker, PointMarker } from "@prisma/client";

const formatDistance = (meters: number) => {
  const km = Math.floor(meters / 1000);
  const m = meters % 1000;
  return `${km}k + ${m.toFixed(2)}m`;
};

interface MarkerWithIcon {
  id: number;
  position: [number, number];
  marker?: IMarker;
  icon?: L.Icon;
}

/* ---------------------------------------
    Icono default Leaflet configurado 1 vez
---------------------------------------- */
L.Marker.prototype.options.icon = L.icon({
  iconUrl: "/images/marker-icon.png",
  shadowUrl: "/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/* ---------------------------------------
    EFECTO SOLO PARA VOLAR AL PUNTO SELECCIONADO
---------------------------------------- */
const SelectedPositionEffect = React.memo(function SelectedPositionEffect({
  selectedPosition,
}: {
  selectedPosition?: { lat: number; lon: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPosition) return;

    const { lat, lng } = map.getCenter();
    const same =
      Math.abs(lat - selectedPosition.lat) < 0.00001 &&
      Math.abs(lng - selectedPosition.lon) < 0.00001;

    if (!same) {
      map.setView([selectedPosition.lat, selectedPosition.lon], 18, {
        animate: true,
      });
    }
  }, [selectedPosition]); // ❗ NO incluir "map"

  return null;
});

const LegendMarkers = React.memo(function LegendMarkers({
  legend,
  visibleGroups,
  selectedPosition,
  openPreview,
}: {
  legend: PointMarker[];
  visibleGroups: Record<number, boolean>;
  selectedPosition?: { lat: number; lon: number } | null;
  openPreview: any;
}) {
  const iconsById = useMemo(() => {
    const map = new Map<number, L.Icon | undefined>();

    legend.forEach((item) => {
      if (map.has(item.id)) return;
      try {
        map.set(
          item.id,
          L.icon({
            iconUrl: (item as any).marker.icon,
            iconSize: [25, 25],
            iconAnchor: [12, 25],
          }),
        );
      } catch {
        map.set(item.id, undefined);
      }
    });

    return map;
  }, [legend]);

  return (
    <>
      {legend
        .filter((item) => visibleGroups[item.markerId || 0] ?? true)
        .map((item) => (
          <MarkerWithAutoTooltip
            key={item.id}
            item={item as any}
            icon={iconsById.get(item.id)}
            selectedPosition={selectedPosition}
            onEyeClick={openPreview}
          />
        ))}
    </>
  );
});

const MarkerWithAutoTooltip = React.memo(function MarkerWithAutoTooltip({
  item,
  icon,
  selectedPosition,
  onEyeClick, // nueva prop
}: {
  item: PointMarker & { marker: IMarker };
  icon?: L.Icon;
  selectedPosition?: { lat: number; lon: number } | null;
  onEyeClick?: (item: any) => any; // función opcional que se dispara al click del ojo
}) {
  const markerRef = React.useRef<L.Marker>(null);

  const isSelected = selectedPosition
    ? Math.abs(item.lat || 0 - selectedPosition.lat) < 0.00001 &&
      Math.abs(item.lon || 0 - selectedPosition.lon) < 0.00001
    : false;

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openTooltip();
    }
  }, [isSelected]);

  return (
    <Marker
      position={[item.lat || 0, item.lon || 0]}
      icon={icon}
      ref={markerRef}
    >
      <Popup>
        <div style={{ textAlign: "center" }}>
          <strong>{item.marker.name}</strong>
          <br />
          <span>Lat: {item.lat?.toFixed(5)}</span>
          <br />
          <span>Lon: {item.lon?.toFixed(5)}</span>
          {item.comment && (
            <>
              <br />
              <em>{item.comment}</em>
            </>
          )}
          <br />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEyeClick && onEyeClick(item);
            }}
            style={{
              marginTop: "8px",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
              color: "#007bff",
              fontSize: "18px",
            }}
            aria-label="Ver detalles"
            title="Ver detalles"
          >
            <i
              className="pi pi-eye"
              style={{ fontSize: "18px", color: "#007bff" }}
            ></i>
          </button>
        </div>
      </Popup>
    </Marker>
  );
});
const PointsLayer = React.memo(function PointsLayer({
  points,
  setCurrentTime,
}: {
  points: (GpsPoint & {
    GpsPointComment?: { comment: string }[];
    fileName?: string; // o el campo que tengas para archivo
  })[];
  setCurrentTime: (v: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const layer = L.layerGroup();

    points.forEach((p) => {
      const commentText =
        p.GpsPointComment?.map((c) => c.comment).join("; ") ?? "";
      const hasComment = commentText.trim().length > 0;

      // Contenido tooltip: comentario + lat/lon + archivo si existe
      const tooltipContent = `
        <div style="font-size: 12px; max-width: 200px;">
          ${hasComment ? `<div><strong>Comentario:</strong> ${commentText}</div>` : ""}
          <div><strong>Lat:</strong> ${p.lat.toFixed(5)}</div>
          <div><strong>Lon:</strong> ${p.lon.toFixed(5)}</div>
          ${p.fileName ? `<div><strong>Archivo:</strong> ${p.fileName}</div>` : ""}
        </div>
      `;

      if (hasComment) {
        const messageIcon = L.divIcon({
          html: `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#007bff" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          `,
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -24],
        });

        const marker = L.marker([p.lat, p.lon], { icon: messageIcon });

        marker.on("click", () => {
          setCurrentTime(p.second);
          marker.openTooltip();
        });

        marker.bindTooltip(tooltipContent, {
          direction: "top",
          offset: [0, -10],
          opacity: 0.9,
        });

        layer.addLayer(marker);
      } else {
        const circle = L.circleMarker([p.lat, p.lon], {
          radius: 5,
          color: "#ff4444",
          fillColor: "#ff4444",
          fillOpacity: 0.8,
          opacity: 0.8,
        });

        circle.on("click", () => setCurrentTime(p.second));

        circle.bindTooltip(tooltipContent, {
          direction: "top",
          offset: [0, -10],
          opacity: 0.9,
        });

        layer.addLayer(circle);
      }
    });

    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [points, setCurrentTime]);

  return null;
});
const MarkerUpdater = React.memo(function MarkerUpdater({
  points,
  currentTime,
  setCurrentTime,
  startKm,
  setOpenPreview,
  setSelectComment,
  setOpenNewCommentDialog,
}: {
  points: GpsPoint[];
  currentTime: number;
  setCurrentTime: (v: number) => void;
  startKm: number;
  setOpenNewCommentDialog: React.Dispatch<React.SetStateAction<boolean>>;

  setOpenPreview: (v: any) => void;
  setSelectComment: React.Dispatch<
    React.SetStateAction<(any & { replies: any[] }) | null>
  >;
}) {
  const map = useMap();

  // 📌 Encuentra el punto más cercano al tiempo actual
  const position = useMemo(() => {
    if (!points.length) return null;
    return points.reduce((prev, curr) =>
      Math.abs(curr.second - currentTime) < Math.abs(prev.second - currentTime)
        ? curr
        : prev,
    );
  }, [points, currentTime]);

  // 📌 Mover mapa solo cuando cambia el punto actual
  useEffect(() => {
    if (!position) return;
    map.setView([position.lat, position.lon], map.getZoom(), {
      animate: true,
    });
  }, [position]);

  // 📌 Icon del marcador (creado una sola vez)
  const customIcon = useMemo(
    () =>
      L.divIcon({
        html: `
          <svg width="20" height="30" viewBox="0 0 20 30">
            <path d="M10 0C6 8 0 20 10 30C20 20 14 8 10 0Z"
              fill="#22c55e" stroke="#15803d" stroke-width="2"/>
          </svg>
        `,
        iconSize: [20, 30],
        iconAnchor: [10, 30],
        className: "",
      }),
    [],
  );

  return (
    <>
      <PointsLayer points={points} setCurrentTime={setCurrentTime} />

      {position && (
        <Marker
          position={[position.lat, position.lon]}
          icon={customIcon}
          bubblingMouseEvents={false} // evita que el mapa capture los clics
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -25]}
            interactive={true} // ← permite clics dentro del tooltip
            className="tooltip-interactive"
          >
            <div className="font-semibold text-[12px]">
              Lat: {position.lat.toFixed(5)} <br />
              Lon: {position.lon.toFixed(5)} <br />
              Dist: {formatDistance(startKm + position.totalDistance)} <br />
              <div className="mt-2 flex justify-center gap-2 pointer-events-auto"></div>
            </div>
          </Tooltip>
        </Marker>
      )}
    </>
  );
});
const AddMarkersOnClick = React.memo(function AddMarkersOnClick({
  addingMode,
  setAddingMode,
  setMarkers,
  openModal,
}: {
  addingMode: boolean;
  setAddingMode: (v: boolean) => void;
  setMarkers: React.Dispatch<React.SetStateAction<MarkerWithIcon[]>>;
  openModal: any;
}) {
  useMapEvent("click", (e) => {
    if (!addingMode) return;

    const icon = L.icon({
      iconUrl: "https://cdn-icons-pNG.flaticon.com/512/684/684908.png",
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    });

    const newMarker: MarkerWithIcon = {
      id: Date.now(),
      position: [e.latlng.lat, e.latlng.lng],
      icon,
    };

    openModal(true);
    // setMarkers((prev) => [...prev, newMarker])
    setAddingMode(false);
  });

  return null;
});
// Componente simple que solo llama onSelect sin validaciones extra

function AddMarkerMode({
  onSelect,
  onCancel,
  canAddMarker, // función que retorna boolean | Promise<boolean>
}: {
  onSelect: (pos: [number, number]) => void;
  onCancel: () => void;
  canAddMarker: (pos: [number, number]) => boolean | Promise<boolean>;
}) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [waiting, setWaiting] = useState(false);

  useMapEvents({
    mousemove(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
    click: async (e) => {
      if (waiting) return; // evitar múltiples clicks mientras espera validación

      const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setWaiting(true);
      onSelect(pos);
    },
    keydown(e) {
      // if (e.originalEvent === "Escape") onCancel()
    },
  });

  return position ? (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        padding: "4px 8px",
        background: "white",
        borderRadius: 4,
        zIndex: 1000,
        pointerEvents: "none",
        opacity: waiting ? 0.5 : 1,
      }}
    >
      Lat: {position[0].toFixed(5)}, Lng: {position[1].toFixed(5)}{" "}
      {waiting && "(validando...)"}
    </div>
  ) : null;
}

export default function GpsMap({
  points,
  currentTime,
  setCurrentTime,
  startKm,
  legend,
  selectedPosition,
  visibleGroups,
  setOpenPreview,
  setSelectComment,
  setOpenNewCommentDialog,
  newPosition,
  setNewPosition,
}: {
  points: GpsPoint[];
  setSelectComment: React.Dispatch<
    React.SetStateAction<(any & { replies: any[] }) | null>
  >;
  setOpenNewCommentDialog: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  setCurrentTime: (v: number) => void;
  setOpenPreview: React.Dispatch<React.SetStateAction<boolean>>;
  startKm: number;
  legend: PointMarker[];
  selectedPosition?: { lat: number; lon: number } | null;
  visibleGroups: Record<number, boolean>;
  newPosition: any;
  setNewPosition: any;
}) {
  const polyline = useMemo(
    () => points.map((p) => [p.lat, p.lon]) as [number, number][],
    [points],
  );

  const center = useMemo<[number, number]>(() => {
    if (!points.length) return [0, 0];
    return [points[0].lat, points[0].lon];
  }, [points]);

  const memoSetCurrentTime = useCallback(
    (v: number) => setCurrentTime(v),
    [setCurrentTime],
  );

  const [markers, setMarkers] = useState<MarkerWithIcon[]>([]);
  const [addingMode, setAddingMode] = useState(false);
  const [selectedPositionNew, setSelectedPositionNew] = useState<
    [number, number] | null
  >(null);

  if (!points.length) {
    return <div className="text-center text-white">Cargando puntos...</div>;
  }

  const onSelectPosition = (pos: [number, number]) => {
    setNewPosition(pos);
    setAddingMode(false);
  };

  const onCancelAdding = () => {
    setAddingMode(false);
  };
  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />

        <Polyline
          positions={polyline}
          pathOptions={{ color: "black", weight: 10, opacity: 0.3 }}
        />
        <Polyline
          positions={polyline}
          pathOptions={{ color: "white", weight: 1 }}
        />
        {addingMode && (
          <AddMarkerMode
            canAddMarker={async (pos: [number, number]) => {
              // Ejemplo: no permitir si latitud < 0
              await new Promise((r) => setTimeout(r, 300)); // simulo delay
              return pos[0] >= 0;
            }}
            onSelect={onSelectPosition}
            onCancel={onCancelAdding}
          />
        )}
        <DraggablePointer
          markers={markers}
          setMarkers={setMarkers as any}
          addingMode={addingMode}
          setAddingMode={setAddingMode}
        />

        <SelectedPositionEffect selectedPosition={selectedPosition} />

        <LegendMarkers
          legend={legend}
          visibleGroups={visibleGroups}
          selectedPosition={selectedPosition}
          openPreview={(e: any) => {
            setSelectComment(e);
            setOpenPreview(true);
            console.log(e);
          }}
        />

        <MarkerUpdater
          points={points}
          currentTime={currentTime}
          setCurrentTime={memoSetCurrentTime}
          startKm={startKm}
          setOpenPreview={setOpenPreview}
          setSelectComment={setSelectComment}
          setOpenNewCommentDialog={setOpenNewCommentDialog}
        />

        <AddMarkersOnClick
          addingMode={addingMode}
          setAddingMode={setAddingMode}
          setMarkers={setMarkers}
          openModal={() => setOpenNewCommentDialog(true)}
        />

        {markers.map((m) => (
          <Marker key={m.id} position={m.position} icon={m.icon}>
            <Tooltip></Tooltip>
          </Marker>
        ))}
      </MapContainer>
      {addingMode && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 500,
            pointerEvents: "none",
          }}
        />
      )}
      {addingMode && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 500,
              pointerEvents: "none",
            }}
          />

          <button
            onClick={() => setAddingMode(false)}
            style={{
              position: "absolute",
              bottom: 20,
              right: 120, // Le doy espacio para que no se superponga con "Añadir marcador"
              zIndex: 1000,
              padding: "12px 20px",
              fontSize: 16,
              borderRadius: "24px",
              backgroundColor: "#dc3545", // rojo para cancelar
              color: "white",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            -
          </button>
        </>
      )}
      {!addingMode && (
        <button
          onClick={() => setAddingMode(true)}
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            zIndex: 1000,
            padding: "12px 20px",
            fontSize: 16,
            borderRadius: "24px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
