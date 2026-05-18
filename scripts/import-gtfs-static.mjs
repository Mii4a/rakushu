import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("TURSO_DATABASE_URL is required");
if (!authToken) throw new Error("TURSO_AUTH_TOKEN is required");

function parseArgs(argv) {
  const args = {
    provider: "",
    region: "",
    sourceUrl: "",
    licenseNote: "",
    file: "",
    replaceExisting: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];

    if (token === "--provider") args.provider = value ?? "";
    if (token === "--region") args.region = value ?? "";
    if (token === "--source-url") args.sourceUrl = value ?? "";
    if (token === "--license-note") args.licenseNote = value ?? "";
    if (token === "--file") args.file = value ?? "";
    if (token === "--append") args.replaceExisting = false;
  }

  return args;
}

function sha1(text) {
  return createHash("sha1").update(text).digest("hex");
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      current = "";
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function parseCsvObjects(text) {
  const rows = parseCsv(text);
  const [headerRow, ...bodyRows] = rows;

  if (!headerRow || headerRow.length === 0) {
    return [];
  }

  return bodyRows.map((cells) =>
    Object.fromEntries(headerRow.map((key, index) => [key, cells[index] ?? ""]))
  );
}

function readGtfsTable(feedPath, filename) {
  const path = join(feedPath, filename);
  if (!existsSync(path)) {
    return [];
  }

  return parseCsvObjects(readFileSync(path, "utf8"));
}

function findGtfsRoot(path) {
  const stats = statSync(path);
  if (!stats.isDirectory()) {
    return path;
  }

  if (existsSync(join(path, "stops.txt"))) {
    return path;
  }

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidate = join(path, entry.name);
    if (existsSync(join(candidate, "stops.txt"))) {
      return candidate;
    }
  }

  return path;
}

function prepareFeedPath(path) {
  const stats = statSync(path);
  if (stats.isDirectory()) {
    const feedPath = findGtfsRoot(path);
    if (!existsSync(join(feedPath, "stops.txt"))) {
      throw new Error(`stops.txt not found in directory: ${path}`);
    }

    return {
      feedPath,
      cleanup: () => {}
    };
  }

  if (extname(path).toLowerCase() !== ".zip") {
    return {
      feedPath: path,
      cleanup: () => {}
    };
  }

  const tempDir = mkdtempSync(join(tmpdir(), "rakushu-gtfs-"));
  execFileSync("unzip", ["-qq", path, "-d", tempDir], { stdio: "pipe" });
  const feedPath = findGtfsRoot(tempDir);

  if (!existsSync(join(feedPath, "stops.txt"))) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`stops.txt not found after extracting zip: ${path}`);
  }

  return {
    feedPath,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true })
  };
}

function normalizeStationName(name) {
  return name
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/駅$/u, "")
    .toLowerCase();
}

function getFeedFingerprint(path) {
  const stats = statSync(path);

  if (stats.isDirectory()) {
    const stopsPath = join(path, "stops.txt");
    if (!existsSync(stopsPath)) {
      throw new Error(`stops.txt not found in directory: ${path}`);
    }
    const raw = readFileSync(stopsPath, "utf8");
    return {
      raw,
      bytes: raw.length,
      label: basename(path)
    };
  }

  const raw = readFileSync(path, "utf8");
  return {
    raw,
    bytes: raw.length,
    label: basename(path)
  };
}

async function importStops(client, feedId, feedPath) {
  const stats = statSync(feedPath);
  if (!stats.isDirectory()) {
    return { imported: 0, skipped: 0 };
  }

  const rows = readGtfsTable(feedPath, "stops.txt");
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const stopId = row.stop_id?.trim();
    const stopName = row.stop_name?.trim();

    if (!stopId || !stopName) {
      skipped += 1;
      continue;
    }

    await client.execute({
      sql: `
        INSERT INTO transit_stops (
          id, feed_id, stop_id, stop_name, stop_lat, stop_lon, parent_station, platform_code, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        feedId,
        stopId,
        stopName,
        row.stop_lat?.trim() || null,
        row.stop_lon?.trim() || null,
        row.parent_station?.trim() || null,
        row.platform_code?.trim() || null,
        Date.now(),
        Date.now()
      ]
    });
    imported += 1;
  }

  return { imported, skipped };
}

async function importRoutes(client, feedId, feedPath) {
  const stats = statSync(feedPath);
  if (!stats.isDirectory()) {
    return { imported: 0, skipped: 0 };
  }

  const rows = readGtfsTable(feedPath, "routes.txt");
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const routeId = row.route_id?.trim();

    if (!routeId) {
      skipped += 1;
      continue;
    }

    const routeType = Number.parseInt(row.route_type?.trim() || "", 10);

    await client.execute({
      sql: `
        INSERT INTO transit_routes (
          id, feed_id, route_id, route_short_name, route_long_name, route_desc, route_type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        feedId,
        routeId,
        row.route_short_name?.trim() || null,
        row.route_long_name?.trim() || null,
        row.route_desc?.trim() || null,
        Number.isFinite(routeType) ? routeType : null,
        Date.now(),
        Date.now()
      ]
    });
    imported += 1;
  }

  return { imported, skipped };
}

async function importTrips(client, feedId, feedPath) {
  const stats = statSync(feedPath);
  if (!stats.isDirectory()) {
    return { imported: 0, skipped: 0 };
  }

  const rows = readGtfsTable(feedPath, "trips.txt");
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const tripId = row.trip_id?.trim();

    if (!tripId) {
      skipped += 1;
      continue;
    }

    await client.execute({
      sql: `
        INSERT INTO transit_trips (
          id, feed_id, trip_id, route_id, service_id, trip_short_name, trip_headsign, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        feedId,
        tripId,
        row.route_id?.trim() || null,
        row.service_id?.trim() || null,
        row.trip_short_name?.trim() || null,
        row.trip_headsign?.trim() || null,
        Date.now(),
        Date.now()
      ]
    });
    imported += 1;
  }

  return { imported, skipped };
}

function parseGtfsBoolean(value) {
  return String(value ?? "").trim() === "1" ? 1 : 0;
}

async function importServices(client, feedId, feedPath) {
  const stats = statSync(feedPath);
  if (!stats.isDirectory()) {
    return { imported: 0, skipped: 0 };
  }

  const rows = readGtfsTable(feedPath, "calendar.txt");
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const serviceId = row.service_id?.trim();
    if (!serviceId) {
      skipped += 1;
      continue;
    }

    await client.execute({
      sql: `
        INSERT INTO transit_services (
          id, feed_id, service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        feedId,
        serviceId,
        parseGtfsBoolean(row.monday),
        parseGtfsBoolean(row.tuesday),
        parseGtfsBoolean(row.wednesday),
        parseGtfsBoolean(row.thursday),
        parseGtfsBoolean(row.friday),
        parseGtfsBoolean(row.saturday),
        parseGtfsBoolean(row.sunday),
        row.start_date?.trim() || null,
        row.end_date?.trim() || null,
        Date.now(),
        Date.now()
      ]
    });
    imported += 1;
  }

  return { imported, skipped };
}

async function importServiceExceptions(client, feedId, feedPath) {
  const stats = statSync(feedPath);
  if (!stats.isDirectory()) {
    return { imported: 0, skipped: 0 };
  }

  const rows = readGtfsTable(feedPath, "calendar_dates.txt");
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const serviceId = row.service_id?.trim();
    const serviceDate = row.date?.trim();
    const exceptionType = Number.parseInt(row.exception_type?.trim() || "", 10);

    if (!serviceId || !serviceDate || !Number.isFinite(exceptionType)) {
      skipped += 1;
      continue;
    }

    await client.execute({
      sql: `
        INSERT INTO transit_service_exceptions (
          id, feed_id, service_id, service_date, exception_type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [randomUUID(), feedId, serviceId, serviceDate, exceptionType, Date.now(), Date.now()]
    });
    imported += 1;
  }

  return { imported, skipped };
}

async function importStopTimes(client, feedId, feedPath) {
  const stats = statSync(feedPath);
  if (!stats.isDirectory()) {
    return { imported: 0, skipped: 0 };
  }

  const rows = readGtfsTable(feedPath, "stop_times.txt");
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const tripId = row.trip_id?.trim();
    const stopId = row.stop_id?.trim();
    const stopSequence = Number.parseInt(row.stop_sequence?.trim() || "", 10);

    if (!tripId || !stopId || !Number.isFinite(stopSequence)) {
      skipped += 1;
      continue;
    }

    await client.execute({
      sql: `
        INSERT INTO transit_stop_times (
          id, feed_id, trip_id, stop_id, arrival_time, departure_time, stop_sequence, stop_headsign, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        feedId,
        tripId,
        stopId,
        row.arrival_time?.trim() || null,
        row.departure_time?.trim() || null,
        stopSequence,
        row.stop_headsign?.trim() || null,
        Date.now(),
        Date.now()
      ]
    });
    imported += 1;
  }

  return { imported, skipped };
}

async function importStationAliases(client, feedId, feedPath, region) {
  const stats = statSync(feedPath);
  if (!stats.isDirectory()) {
    return { imported: 0, skipped: 0 };
  }

  const rows = readGtfsTable(feedPath, "stops.txt");
  const seen = new Set();
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const stopId = row.stop_id?.trim();
    const stopName = row.stop_name?.trim();

    if (!stopId || !stopName) {
      skipped += 1;
      continue;
    }

    const normalizedName = normalizeStationName(stopName);
    const dedupeKey = `${normalizedName}:${stopId}`;
    if (!normalizedName || seen.has(dedupeKey)) {
      skipped += 1;
      continue;
    }

    const result = await client.execute({
      sql: `
        INSERT OR IGNORE INTO transit_station_aliases (
          id, normalized_name, canonical_stop_id, canonical_stop_name, region, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [randomUUID(), normalizedName, stopId, stopName, region, Date.now(), Date.now()]
    });

    seen.add(dedupeKey);
    if (Number(result.rowsAffected ?? 0) > 0) {
      imported += 1;
    } else {
      skipped += 1;
    }
  }

  return { imported, skipped };
}

function buildInClause(values) {
  return values.map(() => "?").join(", ");
}

async function replaceExistingFeedData(client, provider, region) {
  const existingFeeds = await client.execute({
    sql: `
      SELECT id
      FROM transit_feeds
      WHERE provider_name = ? AND region = ?
    `,
    args: [provider, region]
  });

  const feedIds = existingFeeds.rows.map((row) => row.id).filter(Boolean);
  if (feedIds.length === 0) {
    return {
      deletedFeeds: 0,
      deletedAliases: 0
    };
  }

  const existingStops = await client.execute({
    sql: `
      SELECT stop_id
      FROM transit_stops
      WHERE feed_id IN (${buildInClause(feedIds)})
    `,
    args: feedIds
  });

  const stopIds = [...new Set(existingStops.rows.map((row) => row.stop_id).filter(Boolean))];
  let deletedAliases = 0;

  for (let index = 0; index < stopIds.length; index += 100) {
    const chunk = stopIds.slice(index, index + 100);
    const result = await client.execute({
      sql: `
        DELETE FROM transit_station_aliases
        WHERE region = ? AND canonical_stop_id IN (${buildInClause(chunk)})
      `,
      args: [region, ...chunk]
    });
    deletedAliases += Number(result.rowsAffected ?? 0);
  }

  const deletedFeedsResult = await client.execute({
    sql: `
      DELETE FROM transit_feeds
      WHERE provider_name = ? AND region = ?
    `,
    args: [provider, region]
  });

  return {
    deletedFeeds: Number(deletedFeedsResult.rowsAffected ?? 0),
    deletedAliases
  };
}

export async function importGtfsFeed(args) {
  if (!args.provider || !args.region || !args.file) {
    throw new Error("Usage: node scripts/import-gtfs-static.mjs --provider <name> --region <region> --file <path> [--source-url <url>] [--license-note <text>]");
  }

  const prepared = prepareFeedPath(args.file);
  const source = getFeedFingerprint(prepared.feedPath);
  const fileHash = sha1(source.raw);
  const feedId = randomUUID();
  const client = createClient({ url, authToken });
  try {
    const replaced = args.replaceExisting
      ? await replaceExistingFeedData(client, args.provider, args.region)
      : { deletedFeeds: 0, deletedAliases: 0 };

    await client.execute({
      sql: `
        INSERT INTO transit_feeds (
          id, provider_name, source_url, license_note, region, valid_from, valid_to, fetched_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
      `,
      args: [
        feedId,
        args.provider,
        args.sourceUrl || source.label,
        args.licenseNote || `Imported from ${source.label} (${fileHash.slice(0, 12)})`,
        args.region,
        Date.now(),
        Date.now(),
        Date.now()
      ]
    });

    const stops = await importStops(client, feedId, prepared.feedPath);
    const routes = await importRoutes(client, feedId, prepared.feedPath);
    const trips = await importTrips(client, feedId, prepared.feedPath);
    const services = await importServices(client, feedId, prepared.feedPath);
    const serviceExceptions = await importServiceExceptions(client, feedId, prepared.feedPath);
    const stopTimes = await importStopTimes(client, feedId, prepared.feedPath);
    const aliases = await importStationAliases(client, feedId, prepared.feedPath, args.region);

    console.log(JSON.stringify({
      status: "feed-imported",
      feedId,
      provider: args.provider,
      region: args.region,
      file: args.file,
      resolvedFeedPath: prepared.feedPath,
      bytes: source.bytes,
      replaceExisting: args.replaceExisting,
      replaced,
      stops,
      routes,
      trips,
      services,
      serviceExceptions,
      stopTimes,
      aliases,
      note: "Feed metadata, stops, routes, trips, services, service exceptions, stop_times, and station aliases imported."
    }, null, 2));
  } finally {
    prepared.cleanup();
  }
}

async function main() {
  await importGtfsFeed(parseArgs(process.argv.slice(2)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
