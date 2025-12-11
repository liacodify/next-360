import React, { useState, useRef, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";

interface Marker {
  id: number;
  name: string;
  icon: string;
}

interface CardMarkerProps {
  onMarkerClick?: (marker: Marker) => void;
}

export default function CardMarker({ onMarkerClick }: CardMarkerProps) {
  // Estado para minimizar / maximizar el panel
  const [minimized, setMinimized] = useState(false);

  // Referencias para drag
  const containerRef = useRef<HTMLDivElement>(null);
  const dragBtnRef = useRef<HTMLDivElement>(null);
  const dragData = useRef<{
    offsetX: number;
    offsetY: number;
    dragging: boolean;
    dragged: boolean;
  }>({
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    dragged: false,
  });

  // Estado para posición del botón cuando está minimizado
  const [dragPos, setDragPos] = useState({ x: 20, y: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (
        !dragData.current.dragging ||
        !containerRef.current ||
        !dragBtnRef.current
      )
        return;
      e.preventDefault();

      dragData.current.dragged = true; // Marcar que hubo movimiento al arrastrar

      const containerRect = containerRef.current.getBoundingClientRect();
      const btnRect = dragBtnRef.current.getBoundingClientRect();

      let newX = e.clientX - containerRect.left - dragData.current.offsetX;
      let newY = e.clientY - containerRect.top - dragData.current.offsetY;

      // Limitar movimiento dentro del contenedor
      if (newX < 0) newX = 0;
      if (newX + btnRect.width > containerRect.width)
        newX = containerRect.width - btnRect.width;

      if (newY < 0) newY = 0;
      if (newY + btnRect.height > containerRect.height)
        newY = containerRect.height - btnRect.height;

      setDragPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (dragData.current.dragging) {
        dragData.current.dragging = false;
        if (dragData.current.dragged) {
          setMinimized(false); // Abrir panel cuando sueltes tras arrastrar
        }
        dragData.current.dragged = false;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const onDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragBtnRef.current) return;
    const rect = dragBtnRef.current.getBoundingClientRect();
    dragData.current = {
      dragging: true,
      dragged: false,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
  };

  const handleClick = () => {
    if (dragData.current.dragged) {
      // Si fue arrastre, no abrir panel con click
      dragData.current.dragged = false;
      return;
    }
    setMinimized(false);
  };

  const panelStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    right: 0,
    width: 300,
    maxHeight: "80vh",
    backgroundColor: "white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    borderRadius: 8,
    overflow: "auto",
    zIndex: 10000,
    padding: 10,
  };

  const minimizedBtnStyle: React.CSSProperties = {
    position: "absolute",
    top: dragPos.y,
    left: dragPos.x,
    width: 50,
    height: 50,
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "grab",
    userSelect: "none",
    zIndex: 10000,
  };

  const [markers, setMarkers] = useState([]);
  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {!minimized && (
        <div style={panelStyle}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Marcadores</h3>
            <Button
              icon="pi pi-window-minimize"
              className="p-button-text p-button-rounded"
              onClick={() => setMinimized(true)}
              aria-label="Minimizar panel"
              size="small"
            />
          </div>

          <DataTable
            value={markers}
            size="small"
            stripedRows
            scrollable
            scrollHeight="60vh"
            showGridlines
            selectionMode="single"
            showHeaders={false}
            onRowClick={(e: any) => onMarkerClick?.(e.data)}
          >
            <Column
              body={(row: Marker) => (
                <img
                  src={row.icon}
                  alt={row.name}
                  style={{ width: 16, height: 16 }}
                />
              )}
              style={{ width: 40 }}
            />
            <Column field="name" />
          </DataTable>
        </div>
      )}

      {minimized && (
        <div
          ref={dragBtnRef}
          style={minimizedBtnStyle}
          onMouseDown={onDragStart}
          title="Arrastra para mover, haz click para maximizar"
          onClick={handleClick}
        >
          📍
        </div>
      )}
    </div>
  );
}
