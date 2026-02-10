"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "@egjs/view360/css/view360.css";
import View360, { ControlBar, EquirectProjection } from "@egjs/view360";
import ResumenCoordinates from "./resumen-coordinates";
import { GpsPoint } from "@prisma/client";
import CustomControls from "./CustomControls";

export interface GpxPoint {
  id: number;
  lat: number;
  lon: number;
  ele: number | null;
  second: string | null;
  offset?: number;
}

const Video360Section = React.memo(
  function Video360({
    url,
    currentTime,
    onSelectPoint,
    points,
    startKm,
    totalFiles,
    onVideoEnd,
  }: {
    url: string;
    currentTime: {
      second: number;
      fileId: number;
      fileIndex: number;
    };
    onSelectPoint: any;
    points: GpsPoint[];
    startKm: number;
    totalFiles?: number; // Total de archivos disponibles
    onVideoEnd?: () => void; // Callback para cuando termina el video
  }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const viewerRef = useRef<View360 | null>(null);
    const syncingRef = useRef(false);
    const rafIdRef = useRef<number | undefined>(0);
    const lastRoundedTimeRef = useRef(-1);
    const currentUrlRef = useRef<string>("");
    const hasNotifiedEndRef = useRef(false); // Para evitar múltiples notificaciones

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fadeOut, setFadeOut] = useState(false);

    // Limpiar el viewer
    const destroyViewer = useCallback(() => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }

      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying viewer:", e);
        }
        viewerRef.current = null;
      }

      lastRoundedTimeRef.current = -1;
    }, []);

    // Configurar el viewer
    const setupViewer = useCallback(() => {
      if (!containerRef.current || !videoRef.current || !videoUrl) return;

      try {
        // Solo destruir si existe
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        viewerRef.current = new View360(containerRef.current, {
          canvasSelector: ".view360-canvas",
          projection: new EquirectProjection({
            src: videoRef.current,
            video: {
              autoplay: false,
              muted: true,
              loop: false, // ❌ NO loop para poder detectar el final
            },
          }),
          plugins: [
            new ControlBar({
              autoHide: false,
              playButton: true,
              progressBar: true,
              volumeButton: true,
              fullscreenButton: true,
            }),
          ],
        });

        setIsVideoReady(true);
        setIsLoading(false);
        setFadeOut(false);
      } catch (e) {
        console.error("Error setting up viewer:", e);
        setError("Error al configurar el visor 360");
        setIsLoading(false);
        setFadeOut(false);
      }
    }, [videoUrl]);

    // Obtener URL firmada del video
    useEffect(() => {
      if (!url || url.length === 0) {
        setVideoUrl(null);
        setIsLoading(false);
        return;
      }

      // Si es la misma URL, no hacer nada
      if (currentUrlRef.current === url) {
        return;
      }

      let isCancelled = false;

      const fetchVideoUrl = async () => {
        // Iniciar fade out
        setFadeOut(true);

        // Esperar un poco para el fade
        await new Promise((resolve) => setTimeout(resolve, 150));

        setIsLoading(true);
        setIsVideoReady(false);
        setError(null);
        hasNotifiedEndRef.current = false; // Reset al cambiar de video

        try {
          const res = await fetch(
            `/api/s3/getSignedUrl?key=${encodeURIComponent(url)}`,
          );

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          const data = await res.json();

          if (!isCancelled && data.url) {
            currentUrlRef.current = url;
            setVideoUrl(data.url);
          }
        } catch (e) {
          console.error("Error fetching video URL:", e);
          if (!isCancelled) {
            setError("Error al cargar el video");
            setIsLoading(false);
            setFadeOut(false);
          }
        }
      };

      fetchVideoUrl();

      return () => {
        isCancelled = true;
      };
    }, [url]);

    // Manejar cambio de video
    useEffect(() => {
      if (!videoUrl) {
        destroyViewer();
        setIsVideoReady(false);
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      // Resetear estado
      syncingRef.current = true;
      setIsVideoReady(false);

      const handleLoadedData = () => {
        setupViewer();
      };

      const handleError = () => {
        setError("Error al cargar el video");
        setIsLoading(false);
        setFadeOut(false);
      };

      const handleCanPlay = () => {
        // Video listo para reproducir
        setIsLoading(false);
      };

      // 🎯 Detectar cuando el video termina
      const handleEnded = () => {
        console.log("Video terminado:", currentTime.fileIndex);

        if (hasNotifiedEndRef.current) return; // Evitar múltiples llamadas
        hasNotifiedEndRef.current = true;

        // Si hay más videos, avanzar al siguiente
        if (totalFiles && currentTime.fileIndex < totalFiles - 1) {
          console.log("Avanzando al siguiente video...");
          if (onVideoEnd) {
            onVideoEnd();
          }
        } else {
          console.log("Último video alcanzado, permaneciendo en el final");
          // Opcional: Reiniciar al inicio del video actual
          // video.currentTime = 0;
        }
      };

      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("error", handleError);
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("ended", handleEnded);

      // Forzar recarga del video
      video.load();

      return () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("ended", handleEnded);
      };
    }, [
      videoUrl,
      setupViewer,
      destroyViewer,
      currentTime.fileIndex,
      totalFiles,
      onVideoEnd,
    ]);

    // Sincronizar tiempo del video
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !isVideoReady) return;

      const timeDiff = Math.abs(video.currentTime - currentTime.second);

      if (timeDiff > 0.05) {
        syncingRef.current = true;
        video.currentTime = currentTime.second;

        // Dar tiempo para que se sincronice
        const timeout = setTimeout(() => {
          syncingRef.current = false;
        }, 100);

        return () => clearTimeout(timeout);
      } else {
        syncingRef.current = false;
      }
    }, [currentTime.second, currentTime.fileIndex, isVideoReady]);

    // Actualizar posición actual
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !isVideoReady) return;

      const update = () => {
        if (!syncingRef.current) {
          const roundedTime = Math.round(video.currentTime * 10) / 10;

          if (roundedTime !== lastRoundedTimeRef.current) {
            lastRoundedTimeRef.current = roundedTime;
            onSelectPoint({
              second: roundedTime,
              fileId: currentTime.fileId,
              fileIndex: currentTime.fileIndex,
            });
          }
        }

        rafIdRef.current = requestAnimationFrame(update);
      };

      rafIdRef.current = requestAnimationFrame(update);

      return () => {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }
      };
    }, [
      isVideoReady,
      currentTime.fileId,
      currentTime.fileIndex,
      onSelectPoint,
    ]);

    // Cleanup al desmontar
    useEffect(() => {
      return () => {
        destroyViewer();
        currentUrlRef.current = "";
      };
    }, [destroyViewer]);

    if (error) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div className="text-center p-6">
            <div className="text-red-500 text-lg mb-2">⚠️</div>
            <p className="text-gray-700">{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        {/* Loader con transición */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-50 rounded-lg transition-opacity duration-300 ${
            isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
            <p className="text-white text-sm">Cargando video 360°...</p>
          </div>
        </div>

        {/* Info de tiempo */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-md text-sm z-10">
          Tiempo: {currentTime.second.toFixed(2)} s
          {totalFiles && totalFiles > 1 && (
            <span className="ml-2 text-gray-300">
              | Video {currentTime.fileIndex + 1}/{totalFiles}
            </span>
          )}
        </div>

        {/* Contenedor del video 360 con transición */}
        <div
          ref={containerRef}
          className={`w-full h-full relative transition-opacity duration-300 ${
            fadeOut ? "opacity-0" : "opacity-100"
          }`}
          style={{ minHeight: "400px" }}
        >
          <canvas className="view360-canvas w-full h-full"></canvas>
          <video
            ref={videoRef}
            className="hidden"
            crossOrigin="anonymous"
            playsInline
            muted
            preload="auto"
          >
            {videoUrl && <source src={videoUrl} type="video/mp4" />}
          </video>
        </div>

        {/* <CustomControls */}
        {/*   videoRef={videoRef} */}
        {/*   currentTime={currentTime} */}
        {/*   onSelectPoint={onSelectPoint} */}
        {/* /> */}
      </div>
    );
  },
  // Comparador personalizado para evitar re-renders innecesarios
  (prevProps, nextProps) => {
    return (
      prevProps.url === nextProps.url &&
      prevProps.currentTime.fileId === nextProps.currentTime.fileId &&
      prevProps.currentTime.fileIndex === nextProps.currentTime.fileIndex &&
      Math.abs(prevProps.currentTime.second - nextProps.currentTime.second) <
        0.1 &&
      prevProps.startKm === nextProps.startKm &&
      prevProps.totalFiles === nextProps.totalFiles
    );
  },
);

export default Video360Section;
