import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { importGtfsFeed } from "./import-gtfs-static.mjs";

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

function loadManifest(path) {
  const absolutePath = resolve(path);
  const raw = JSON.parse(readFileSync(absolutePath, "utf8"));

  if (!Array.isArray(raw.feeds)) {
    throw new Error("Manifest must contain a feeds array");
  }

  return {
    manifestPath: absolutePath,
    feeds: raw.feeds.map((feed, index) => {
      if (!feed?.provider || !feed?.region || !feed?.file) {
        throw new Error(`feeds[${index}] must include provider, region, and file`);
      }

      return {
        provider: String(feed.provider),
        region: String(feed.region),
        file: resolve(feed.file),
        sourceUrl: feed.sourceUrl ? String(feed.sourceUrl) : "",
        licenseNote: feed.licenseNote ? String(feed.licenseNote) : "",
        replaceExisting: feed.append ? false : true
      };
    })
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.manifest) {
    throw new Error("Usage: node scripts/import-gtfs-manifest.mjs --manifest <path>");
  }

  const manifest = loadManifest(args.manifest);
  const results = [];

  for (const feed of manifest.feeds) {
    const startedAt = Date.now();
    try {
      await importGtfsFeed(feed);
      results.push({
        provider: feed.provider,
        region: feed.region,
        file: feed.file,
        status: "imported",
        elapsedMs: Date.now() - startedAt
      });
    } catch (error) {
      results.push({
        provider: feed.provider,
        region: feed.region,
        file: feed.file,
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
