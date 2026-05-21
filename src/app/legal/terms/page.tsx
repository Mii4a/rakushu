export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <section className="page-stack">
      <article className="panel space-y-4">
        <h1 className="section-title">利用規約</h1>
        <p className="text-sm text-slate-700">
          本規約は、らくしゅうが提供する求人整理・比較・履歴書作成支援サービスの利用条件を定めるものです。
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>ユーザーは、法令・公序良俗に反しない範囲で本サービスを利用するものとします。</li>
          <li>アカウント情報およびログイン手段の管理はユーザー自身の責任で行うものとします。</li>
          <li>本サービスの一部機能は有料プランとして提供され、決済は Stripe を通じて行われます。</li>
          <li>有料プランは月額契約であり、ユーザーが解約手続きを完了しない限り自動更新されます。</li>
          <li>解約は Stripe の請求ポータル上で行うことができ、次回更新日前までに完了した場合、次回以降の請求は行われません。</li>
          <li>当方は、サービス改善・保守・法令対応その他必要がある場合、機能・料金・提供条件を変更することがあります。</li>
          <li>ユーザーが本規約に違反した場合、当方は事前通知なく利用停止その他必要な措置を講じることがあります。</li>
          <li>当方は、天災、通信障害、外部サービス障害その他合理的に制御困難な事由による損害について責任を負いません。</li>
          <li>本規約は必要に応じて改定され、改定後の内容は本サービス上への掲載その他相当の方法で周知します。</li>
          <li>反社会的勢力による利用を禁止します。</li>
        </ol>
      </article>
    </section>
  );
}
