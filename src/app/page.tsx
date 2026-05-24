import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HomeDemo } from "@/components/home-demo";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "トップ",
  description: "求人票を貼るだけで、固定残業・休日・福利厚生の差を整理し、気になる求人だけ保存しやすくする。",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "らくしゅう | 求人を見極めて、就活を整える",
    description: "求人票を貼るだけで、固定残業・休日・福利厚生の差を整理し、気になる求人だけ保存しやすくする。",
    url: "/"
  },
  twitter: {
    title: "らくしゅう | 求人を見極めて、就活を整える",
    description: "求人票を貼るだけで、固定残業・休日・福利厚生の差を整理し、気になる求人だけ保存しやすくする。"
  }
};

export default async function HomePage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <HomeDemo />;
}
