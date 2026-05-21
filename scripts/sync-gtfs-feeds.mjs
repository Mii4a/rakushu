import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { importGtfsFeed } from "./import-gtfs-static.mjs";

const ODPT_ACCESS_TOKEN = process.env.ODPT_ACCESS_TOKEN ?? "";

function parseArgs(argv) {
  const args = {
    manifest: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];

    if (token === "--manifest") {
      args.manifest = value ?? "";
      index += 1;
    }
  }

  return args;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withAccessToken(url) {
  if (!url.includes("YOUR_ACCESS_TOKEN")) {
    return url;
  }

  if (!ODPT_ACCESS_TOKEN) {
    throw new Error("ODPT_ACCESS_TOKEN is required for feeds that use YOUR_ACCESS_TOKEN");
  }

  return url.replaceAll("YOUR_ACCESS_TOKEN", ODPT_ACCESS_TOKEN);
}

function loadManifest(path) {
  const absolutePath = resolve(path);
  const raw = JSON.parse(readFileSync(absolutePath, "utf8"));

  if (!Array.isArray(raw.feeds)) {
    throw new Error("Manifest must contain a feeds array");
  }

  return {
    manifestPath: absolutePath,
    feeds: raw.feeds.map((feed, index) => {
      if (!feed?.provider || !feed?.region) {
        throw new Error(`feeds[${index}] must include provider and region`);
      }

      if (!feed?.file && !feed?.downloadUrl) {
        throw new Error(`feeds[${index}] must include either file or downloadUrl`);
      }

      const provider = String(feed.provider);
      const region = String(feed.region);

      return {
        provider,
        region,
        file: feed.file ? resolve(feed.file) : "",
        downloadUrl: feed.downloadUrl ? String(feed.downloadUrl) : "",
        downloadTo: feed.downloadTo
          ? resolve(feed.downloadTo)
          : resolve(".cache/gtfs", `${region}-${slugify(provider) || "feed"}.zip`),
        sourceUrl: feed.sourceUrl ? String(feed.sourceUrl) : "",
        licenseNote: feed.licenseNote ? String(feed.licenseNote) : "",
        replaceExisting: feed.append ? false : true
      };
    })
  };
}

async function downloadFeed(url, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const response = await fetch(withAccessToken(url));

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(outputPath, buffer);
  return outputPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.manifest) {
    throw new Error("Usage: node scripts/sync-gtfs-feeds.mjs --manifest <path>");
  }

  const manifest = loadManifest(args.manifest);
  const results = [];

  for (const feed of manifest.feeds) {
    const startedAt = Date.now();
    try {
      const file = feed.downloadUrl ? await downloadFeed(feed.downloadUrl, feed.downloadTo) : feed.file;

      await importGtfsFeed({
        provider: feed.provider,
        region: feed.region,
        file,
        sourceUrl: feed.sourceUrl || feed.downloadUrl,
        licenseNote: feed.licenseNote,
        replaceExisting: feed.replaceExisting
      });

      results.push({
        provider: feed.provider,
        region: feed.region,
        file,
        status: "imported",
        elapsedMs: Date.now() - startedAt
      });
    } catch (error) {
      results.push({
        provider: feed.provider,
        region: feed.region,
        file: feed.file || feed.downloadTo,
        status: "failed",
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        manifest: manifest.manifestPath,
        imported: results.filter((result) => result.status === "imported").length,
        failed: results.filter((result) => result.status === "failed").length,
        results
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
