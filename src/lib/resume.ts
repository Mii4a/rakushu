import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { resumeProfiles } from "@/lib/db/schema";

export async function getUserResumeProfile(userId: string) {
  return db.query.resumeProfiles.findFirst({
    where: eq(resumeProfiles.userId, userId)
  });
}
