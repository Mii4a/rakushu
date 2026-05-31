import { eq, getTableColumns } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { resumeProfiles } from "@/lib/db/schema";

const resumeProfileColumns = getTableColumns(resumeProfiles);

export async function getUserResumeProfile(userId: string) {
  const rows = await db
    .select({
      ...resumeProfileColumns
    })
    .from(resumeProfiles)
    .where(eq(resumeProfiles.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}
