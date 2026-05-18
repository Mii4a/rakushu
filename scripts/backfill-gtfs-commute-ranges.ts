import { and, eq, isNotNull, isNull, or } from "drizzle-orm";

import { resolveCommuteFields } from "@/lib/commute";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";

type Options = {
  dryRun: boolean;
  jobId: string | null;
};

function parseOptions(argv: string[]): Options {
  let dryRun = false;
  let jobId: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (value === "--job-id") {
      jobId = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return { dryRun, jobId };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const now = new Date();

  const targetJobs = await db.query.jobs.findMany({
    where:
      options.jobId != null
        ? eq(jobs.id, options.jobId)
        : and(
            isNotNull(jobs.nearestStation),
            or(
              isNull(jobs.commuteDataKind),
              eq(jobs.commuteDataKind, "gtfs_range"),
              eq(jobs.commuteDataKind, "estimated_range"),
              eq(jobs.commuteDataKind, "unsupported")
            )
          )
  });

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for (const job of targetJobs) {
    scanned += 1;
    const commuteFields = await resolveCommuteFields({
      userId: job.userId,
      destinationStationName: job.nearestStation,
      manualCommuteMinutes: job.commuteDataKind === "manual" ? job.commuteMinutes : null
    });

    if (commuteFields.commuteDataKind !== "gtfs_range") {
      skipped += 1;
      continue;
    }

    const hasChanges =
      job.commuteMinutes !== commuteFields.commuteMinutes ||
      job.commuteMinutesMin !== commuteFields.commuteMinutesMin ||
      job.commuteMinutesMax !== commuteFields.commuteMinutesMax ||
      job.commuteMinutesTypical !== commuteFields.commuteMinutesTypical ||
      job.commuteDataKind !== commuteFields.commuteDataKind;

    if (!hasChanges) {
      skipped += 1;
      continue;
    }

    if (!options.dryRun) {
      await db
        .update(jobs)
        .set({
          ...commuteFields,
          updatedAt: now
        })
        .where(eq(jobs.id, job.id));
    }

    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        scanned,
        updated,
        skipped
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
