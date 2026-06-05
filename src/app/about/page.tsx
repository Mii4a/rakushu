import type { Metadata } from "next";

import { AboutFaqPage } from "@/components/about-faq-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "よくある質問",
  description: "らくしゅうの使い方、機能、プラン、プライバシーに関するよくある質問をまとめています。",
  alternates: {
    canonical: "/about"
  },
  openGraph: {
    title: "らくしゅう よくある質問",
    description: "らくしゅうの使い方、機能、プラン、プライバシーに関するよくある質問をまとめています。",
    url: "/about"
  },
  twitter: {
    title: "らくしゅう よくある質問",
    description: "らくしゅうの使い方、機能、プラン、プライバシーに関するよくある質問をまとめています。"
  }
};

export default function AboutPage() {
  return <AboutFaqPage />;
}
