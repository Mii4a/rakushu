import { createLocalSession } from "./local-auth.mjs";

export default async function globalSetup() {
  await createLocalSession();
}
