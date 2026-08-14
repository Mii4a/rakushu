import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function NextStepCard({ href }: { href: string }) {
  return (
    <section className="research-next-step-card">
      <p className="research-next-step-kicker">次のステップ</p>
      <h2>履歴書 / ES 作成を始める</h2>
      <p>この企業研究をもとに、あなたの強みや経験を効果的に伝えます。</p>
      <Link href={href}>作成をはじめる <ArrowRight className="size-4" /></Link>
    </section>
  );
}
