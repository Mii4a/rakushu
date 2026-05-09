export const dynamic = "force-dynamic";

export default function CommercePage() {
  return (
    <section className="page-stack">
      <article className="panel space-y-4">
        <h1 className="section-title">特定商取引法に基づく表記</h1>
        <dl className="space-y-3 text-sm text-slate-700">
          <div><dt className="font-semibold">販売事業者</dt><dd>らくしゅう運営</dd></div>
          <div><dt className="font-semibold">運営責任者</dt><dd>別府 翔太</dd></div>
          <div><dt className="font-semibold">所在地</dt><dd>東京都世田谷区世田谷１−１０−１５グリューネ•ヴォーヌンク世田谷１０３</dd></div>
          <div><dt className="font-semibold">お問い合わせ先</dt><dd>mii4a2501@gmail.com（後日カスタムアドレスへ変更予定）</dd></div>
          <div><dt className="font-semibold">販売価格</dt><dd>料金ページに表示する各プランの価格（税込）</dd></div>
          <div><dt className="font-semibold">商品代金以外の必要料金</dt><dd>インターネット接続に伴う通信費等はお客様負担</dd></div>
          <div><dt className="font-semibold">代金の支払時期・方法</dt><dd>クレジットカード決済（Stripe）により、申込時に課金</dd></div>
          <div><dt className="font-semibold">サービス提供時期</dt><dd>決済完了後、直ちに利用可能</dd></div>
          <div><dt className="font-semibold">解約</dt><dd>次回更新日前までに所定の方法で解約可能</dd></div>
        </dl>
      </article>
    </section>
  );
}
