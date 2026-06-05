import { cleanupLocalSession } from "./local-auth.mjs";

export default async function globalTeardown() {
  await cleanupLocalSession();
}
