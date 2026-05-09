export default function TermsPage() {
  return (
    <section className="page-stack">
      <article className="panel space-y-4">
        <h1 className="section-title">利用規約</h1>
        <p className="text-sm text-slate-700">本規約は、らくしゅうの利用条件を定めるものです。正式運用前に内容を調整してください。</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>ユーザーは、法令・公序良俗に反しない範囲で本サービスを利用するものとします。</li>
          <li>アカウント情報はユーザー自身の責任で管理してください。</li>
          <li>料金・提供機能は予告なく変更される場合があります。</li>
          <li>有料プランはStripeを通じて決済されます。</li>
          <li>反社会的勢力の利用を禁止します。</li>
          <li>当社は、必要に応じて本規約を改定できます。</li>
        </ol>
      </article>
    </section>
  );
}
