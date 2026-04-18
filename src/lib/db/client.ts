import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { serverEnv } from "@/lib/env/server";
import * as schema from "@/lib/db/schema";

const client = createClient({
  url: serverEnv.TURSO_DATABASE_URL,
  authToken: serverEnv.TURSO_AUTH_TOKEN
});

export const db = drizzle(client, { schema });
