import { NextResponse } from "next/server";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { getFileContent } from "@/lib/aws-s3";

interface GpsPointDB {
  lat: number;
  lon: number;
  second: number;
  segmentDistance: number;
  totalDistance: number;
}
interface GpxPointWithIndex {
  lat: number;
  lon: number;
  ele: number;
  time: string;
  secondIndex: number;
}

async function handleRequest(
  req: Request,
): Promise<[string, string, string, string, number, number[]]> {
  const json = await req.json();

  const file = String(json.fileKey ?? "");
  const gps = String(json.gpsKey ?? "");
  const fileName = String(json.fileName ?? "");
  const startPlace = String(json.startPlace ?? "");
  const projectId = Number(json.projectId ?? "");

  const tagIds = json.tagIds ?? [];

  return [file, gps, fileName, startPlace, projectId, tagIds];
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
  const updateData: any = {};

  if (fileName) updateData.fileName = path.basename(fileName);
  if (mp4FilePath) updateData.filePath = mp4FilePath;
  if (startPlace) updateData.startPlace = startPlace;
  if (projectId !== undefined) updateData.projectId = projectId;
  if (tagIds) updateData.tags = tagIds;

  await db.file.update({
    where: { id: fileId },
    data: updateData,
  });

  if (cleanGPS && cleanGPS.length > 0) {
    await db.gpsPoint.deleteMany({ where: { fileId } });

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
  startPlace: number,
  cleanGPS: GpsPointDB[],
  projectId: number,
  tagIds: number[],
): Promise<{ fileId: number; totalDistance: number }> {
  const mp4FileName = path.basename(mp4FilePath);

  const fileRecord = await db.file.create({
    data: {
      fileName: mp4FileName,
      filePath: mp4FilePath,
      projectId,
      duration: 30,
      startPlace,
      tags: tagIds,
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
    const [fileKey, gpsKey, fileName, startPlace, projectId, tagIds] =
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
      Number(startPlace),
      gpsPointsWithDistances,
      projectId,
      tagIds,
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

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 },
      );
    }

    await db.gpsPoint.deleteMany({
      where: { fileId: id },
    });

    await db.file.delete(id);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
