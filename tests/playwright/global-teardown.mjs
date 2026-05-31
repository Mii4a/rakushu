import { cleanupProdSession } from "./prod-auth.mjs";

export default async function globalTeardown() {
  await cleanupProdSession();
}
