import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TopLandingPage } from "@/components/top-landing-page";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "トップ",
  description: "求人票を貼るところから企業研究・履歴書・AI面接まで、一社の選考準備を不安ごと進めやすくする。",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "らくしゅう | 一社ずつ、就活を完遂しやすくする",
    description: "求人票を貼るところから企業研究・履歴書・AI面接まで、一社の選考準備を不安ごと進めやすくする。",
    url: "/"
  },
  twitter: {
    title: "らくしゅう | 一社ずつ、就活を完遂しやすくする",
    description: "求人票を貼るところから企業研究・履歴書・AI面接まで、一社の選考準備を不安ごと進めやすくする。"
  }
};

export default async function HomePage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <TopLandingPage />;
}
