import { redirect } from "next/navigation";

import { HomeDemo } from "@/components/home-demo";
import { getSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <HomeDemo />;
}
