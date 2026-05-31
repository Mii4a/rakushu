import { createProdSession } from "./prod-auth.mjs";

export default async function globalSetup() {
  await createProdSession();
}
