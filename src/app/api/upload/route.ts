import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { XMLParser } from "fast-xml-parser";

export const runtime = "nodejs";
import { Writable } from "stream";

import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { getFileContent } from "@/lib/aws-s3";
function convertInsvToMp4(
  inputPath: string,
  outputPath: string,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const mainDemoPath =
      "/home/system/Videos/Linux_CameraSDK-2.1.1_MediaSDK-3.1.1/Linux_CameraSDK-2.1.1_MediaSDK-3.1.1/libMediaSDK-dev-3.1.1.0-20250922_191110-amd64/example/main_demo";

    const args = [
      "-inputs",
      inputPath,
      "-output",
      outputPath,
      "-stitch_type",
      "template",
      "-enable_flowstate",
      "ON",
      "-enable_directionlock",
      "ON",
      "-output_size",
      "3840x1920",
      "-disable_cuda",
      "true",
      "-enable_soft_encode",
      "true",
      "-enable_soft_decode",
      "true",
    ];

    const proc = spawn(mainDemoPath, args);

    proc.stdout.on("data", (data) => {
      console.log(`main_demo stdout: ${data.toString()}`);
    });

    proc.stderr.on("data", (data) => {
      console.error(`main_demo stderr: ${data.toString()}`);
    });

    proc.on("close", (code) => {
      console.log(`main_demo process closed with code ${code}`);
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: `main_demo exited with code ${code}`,
        });
      }
    });

    proc.on("error", (err) => {
      console.log("main_demo process error:", err);
      resolve({ success: false, error: err.message });
    });
  });
}

function runExiftool(
  filePath: string,
): Promise<{ datetime: string; lat: number; lon: number }[]> {
  return new Promise((resolve, reject) => {
    const args = [
      "-ee3",
      "-n",
      "-p",
      "$GPSDateTime,$GPSLatitude,$GPSLongitude",
      filePath,
    ];
    const exif = spawn("exiftool", args);

    let lines: string[] = [];

    exif.stdout.on("data", (data) => {
      lines.push(...data.toString().trim().split("\n"));
    });

    exif.stderr.on("data", (data) => {
      console.error("Exiftool stderr:", data.toString());
    });

    exif.on("close", (code) => {
      if (code !== 0) return reject("Exiftool returned code " + code);

      const parsed = lines
        .map((line) => {
          const [datetime, lat, lon] = line.split(",");
          return { datetime, lat: Number(lat), lon: Number(lon) };
        })
        .filter((p) => p.lat && p.lon);

      resolve(parsed);
    });
  });
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // metros
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------
// POST — subir, extraer GPS y guardar
// ---------------------------
function cleanGpsJumps(
  points: { datetime: string; lat: number; lon: number }[],
) {
  if (!points.length) return [];

  const cleaned = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = points[i];

    // Distancia muy simple: diferencia absoluta
    const dLat = Math.abs(curr.lat - prev.lat);
    const dLon = Math.abs(curr.lon - prev.lon);

    // Si es un salto demasiado grande → lo ignoramos
    if (dLat > 0.0008 || dLon > 0.0008) {
      // console.log("IGNORADO salto raro", curr)
      continue;
    }

    cleaned.push(curr);
  }

  return cleaned;
}

function removeDuplicates(list: any) {
  const cleaned = [];
  const seen = new Set();

  for (const p of list) {
    const key = p.datetime;
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(p);
    }
  }
  return cleaned;
}

function parseExifDate(str: string) {
  if (!str) return NaN;
  // Convierte "2025:11:15 16:11:09.9Z"  →  "2025-11-15T16:11:09.9Z"
  const iso = str.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3T");
  return Date.parse(iso);
}

function fillMissingTimestamps(data: any[]) {
  if (!data.length) return [];

  // 1) Parsear la fecha EXIF
  const parsed = data
    .map((p) => ({
      t: parseExifDate(p.datetime),
      lat: p.lat,
      lon: p.lon,
    }))
    .filter((p) => !isNaN(p.t));

  if (!parsed.length) return [];

  // 2) Ordenar
  parsed.sort((a, b) => a.t - b.t);

  const start = parsed[0].t;
  const end = parsed[parsed.length - 1].t;

  const step = 100; // cada 0.1 segundos (100ms)
  const filled = [];

  let cursorIndex = 0;
  let lastKnown = parsed[0];

  for (let t = start; t <= end; t += step) {
    while (cursorIndex + 1 < parsed.length && parsed[cursorIndex + 1].t <= t) {
      cursorIndex++;
      lastKnown = parsed[cursorIndex];
    }

    filled.push({
      time: Number(((t - start) / 1000).toFixed(1)),
      lat: lastKnown.lat,
      lon: lastKnown.lon,
    });
  }

  return filled;
}

interface GpsPointRaw {
  lat: number;
  lon: number;
  time: number; // Usando 'time' interpolado
}

interface GpsPointDB {
  lat: number;
  lon: number;
  second: number;
  segmentDistance: number;
  totalDistance: number;
}

/**
 * 🛠️ Manejo y validación de la solicitud
 */
async function handleRequest(
  req: Request,
): Promise<[string, string, string, string, number]> {
  const json = await req.json();

  const file = String(json.fileKey ?? "");
  const gps = String(json.gpsKey ?? "");
  const fileName = String(json.fileName ?? "");
  const startPlace = String(json.startPlace ?? "");
  const projectId = Number(json.projectId ?? "");

  console.log(json);
  return [file, gps, fileName, startPlace, projectId];
}
/**
 * 📁 Manejo del archivo: Guarda el archivo original y prepara las rutas
 */
async function handleFileUpload(file: File): Promise<string> {
  const uploadDir = path.join(process.cwd(), "uploads");

  // 1. Asegurar la existencia del directorio de subida
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  console.log("hola");

  const originalFilePath = path.join(uploadDir, file.name);

  // 2. Crear un Stream de Escritura al disco
  const writeStream = fs.createWriteStream(originalFilePath);

  // 3. Obtener el ReadableStream del archivo (Web Stream API)
  const readableStream = file.stream();

  // 4. Escribir el archivo usando el Web Stream API
  const writableWebStream = Writable.toWeb(writeStream);

  // Pipe the streams and wait for completion
  await readableStream.pipeTo(writableWebStream);

  // 5. Retornar la ruta
  return originalFilePath;
}

async function convertVideo(
  originalFilePath: string,
  fileName: string,
): Promise<string> {
  const uploadDir = path.join(process.cwd(), "uploads");
  const baseName = fileName.replace(/\.insv$/i, "");
  const mp4FileName = baseName + ".mp4";
  const mp4FilePath = path.join(uploadDir, mp4FileName);

  const result = await convertInsvToMp4(originalFilePath, mp4FilePath);
  if (!result.success) {
    throw new Error("Error converting video: " + result.error);
  }

  return mp4FilePath;
}

async function processGpsData(originalFilePath: string): Promise<GpsPointDB[]> {
  const rawData = await runExiftool(originalFilePath);
  const gpsRaw = cleanGpsJumps(rawData);
  const dataNotDuplicates = removeDuplicates(gpsRaw);
  const cleanData: GpsPointRaw[] = fillMissingTimestamps(dataNotDuplicates);

  let totalDistance = 0;
  let last: GpsPointRaw | null = null;

  // Convertimos cleanData al formato para BD y calculamos distancias
  const cleanGPS = cleanData.map((p) => {
    let segmentDist = 0;

    if (last) {
      segmentDist = haversine(last.lat, last.lon, p.lat, p.lon);
      totalDistance += segmentDist;
    }

    last = p;

    return {
      lat: p.lat,
      lon: p.lon,
      second: Number(p.time),
      segmentDistance: segmentDist,
      totalDistance: totalDistance,
    };
  });

  return cleanGPS;
}

async function updateInDatabase(
  fileId: number,
  mp4FilePath: string | undefined,
  fileName: string | undefined,
  startPlace: string | undefined,
  cleanGPS: GpsPointDB[] | undefined,
  projectId: number | undefined,
  tagIds?: number[],
): Promise<boolean> {
  // Construir objeto para actualizar solo los campos que sí llegan
  const updateData: any = {};

  if (fileName) updateData.fileName = path.basename(fileName);
  if (mp4FilePath) updateData.filePath = mp4FilePath;
  if (startPlace) updateData.startPlace = startPlace;
  if (projectId !== undefined) updateData.projectId = projectId;
  if (tagIds) updateData.tags = tagIds;

  // Actualizar el registro del archivo
  await db.file.update({
    where: { id: fileId },
    data: updateData,
  });

  // Si llega nuevo GPS, elimina puntos antiguos y crea nuevos
  if (cleanGPS && cleanGPS.length > 0) {
    // Eliminar puntos GPS antiguos
    await db.gpsPoint.deleteMany({ where: { fileId } });

    // Insertar nuevos puntos GPS
    await db.$executeRaw`
      INSERT INTO "GpsPoint" ("lat", "lon", "second", "segmentDistance", "totalDistance", "fileId")
      VALUES ${Prisma.join(
        cleanGPS.map(
          (p) =>
            Prisma.sql`(${p.lat}, ${p.lon}, ${p.second}, ${p.segmentDistance}, ${p.totalDistance}, ${fileId})`,
        ),
      )}
    `;
  }

  return true;
}
async function saveToDatabase(
  mp4FilePath: string,
  fileName: string,
  startPlace: string,
  cleanGPS: GpsPointDB[],
  projectId: number,
): Promise<{ fileId: number; totalDistance: number }> {
  const mp4FileName = path.basename(mp4FilePath);

  // 1. Crear el registro del archivo
  const fileRecord = await db.file.create({
    data: {
      fileName: mp4FileName,
      filePath: mp4FilePath,
      projectId,
      duration: 30, // Asume una duración fija o añade lógica para obtenerla
      startPlace,
    },
  });

  // Calcula la distancia total del último punto
  const totalDistance =
    cleanGPS.length > 0 ? cleanGPS[cleanGPS.length - 1].totalDistance : 0;

  // 2. Insertar los puntos GPS
  if (cleanGPS.length > 0) {
    await db.$executeRaw`
      INSERT INTO "GpsPoint" ("lat", "lon", "second", "segmentDistance", "totalDistance", "fileId")
      VALUES ${Prisma.join(
        cleanGPS.map(
          (p) =>
            Prisma.sql`(${p.lat}, ${p.lon}, ${p.second}, ${p.segmentDistance}, ${p.totalDistance}, ${fileRecord.id})`,
        ),
      )}
    `;
  }

  return { fileId: fileRecord.id, totalDistance };
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;

  const R = 6371000; // radio tierra en metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function parseGpxAndCalculateDistances(gpxString: string): GpsPointDB[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const gpxObj = parser.parse(gpxString);
  const trkpts = gpxObj.gpx?.trk?.trkseg?.trkpt;

  if (!trkpts) return [];

  const points = Array.isArray(trkpts) ? trkpts : [trkpts];

  const result: GpsPointDB[] = [];
  const seenSeconds = new Set<string>();
  let totalDistance = 0;
  let previousPoint: { lat: number; lon: number } | null = null;
  let secondIndex = 0;

  for (const pt of points) {
    const lat = parseFloat(pt.lat);
    const lon = parseFloat(pt.lon);
    const time = pt.time;
    const secondKey = time.slice(0, 19);

    if (!seenSeconds.has(secondKey)) {
      let segmentDistance = 0;
      if (previousPoint) {
        segmentDistance = haversineDistance(
          previousPoint.lat,
          previousPoint.lon,
          lat,
          lon,
        );
        totalDistance += segmentDistance;
      }

      result.push({
        lat,
        lon,
        second: secondIndex,
        segmentDistance,
        totalDistance,
      });

      seenSeconds.add(secondKey);
      previousPoint = { lat, lon };
      secondIndex++;
    }
  }

  return result;
}

interface GpxPointWithIndex {
  lat: number;
  lon: number;
  ele: number;
  time: string;
  secondIndex: number;
}
function parseGpxAndFilterBySecondIndexed(
  gpxString: string,
): GpxPointWithIndex[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const gpxObj = parser.parse(gpxString);
  const trkpts = gpxObj.gpx?.trk?.trkseg?.trkpt;

  if (!trkpts) return [];

  const points = Array.isArray(trkpts) ? trkpts : [trkpts];

  const filteredPoints: GpxPointWithIndex[] = [];
  const seenSeconds = new Set<string>();
  let index = 0;

  for (const pt of points) {
    const lat = parseFloat(pt.lat);
    const lon = parseFloat(pt.lon);
    const ele = parseFloat(pt.ele);
    const time = pt.time;
    const secondKey = time.slice(0, 19);

    if (!seenSeconds.has(secondKey)) {
      filteredPoints.push({ lat, lon, ele, time, secondIndex: index });
      seenSeconds.add(secondKey);
      index++;
    }
  }

  return filteredPoints;
}
export async function POST(req: Request) {
  try {
    const [fileKey, gpsKey, fileName, startPlace, projectId] =
      await handleRequest(req);

    console.log(handleRequest(req));

    const originalFilePath = fileKey;
    const key = `${gpsKey}`;
    const gpxContent = await getFileContent(key);
    const gpsPoints = parseGpxAndFilterBySecondIndexed(gpxContent);
    const gpsPointsWithDistances = parseGpxAndCalculateDistances(gpxContent);

    const { fileId, totalDistance } = await saveToDatabase(
      originalFilePath,
      fileName,
      startPlace,
      gpsPointsWithDistances,
      projectId,
    );
    return NextResponse.json({
      ok: true,
      fileId: fileId,
      savedPoints: gpsPointsWithDistances.length,
      totalDistance_m: totalDistance.toFixed(2),
      totalDistance_km: (totalDistance / 1000).toFixed(2),
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    const status = errorMessage.includes("file provided") ? 400 : 500;
    return NextResponse.json({ error: errorMessage }, { status: status });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, fileKey, gpsKey, fileName, startPlace, projectId, tagIds } =
      await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 },
      );
    }

    // Similar lógica que en POST pero para actualizar
    const gpxContent = gpsKey ? await getFileContent(gpsKey) : null;
    const gpsPointsWithDistances = gpxContent
      ? parseGpxAndCalculateDistances(gpxContent)
      : [];

    // Actualizar registro en DB

    const updated = await updateInDatabase(
      id,
      fileKey,
      fileName,
      startPlace,
      gpsPointsWithDistances,
      projectId,
      tagIds,
    );

    if (!updated) {
      return NextResponse.json({ error: "Element not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: "Elemento actualizado correctamente",
      updatedId: id,
      savedPoints: gpsPointsWithDistances.length,
    });
  } catch (error) {
    console.error("Error in PUT handler:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
