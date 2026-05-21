export const dynamic = "force-dynamic";

export default function CommercePage() {
  return (
    <section className="page-stack">
      <article className="panel space-y-4">
        <h1 className="section-title">特定商取引法に基づく表記</h1>
        <p className="text-sm text-slate-700">
          らくしゅうの有料プランおよび関連課金に関する表示です。契約前に、料金・更新・解約・返金条件をご確認ください。
        </p>
        <dl className="space-y-3 text-sm text-slate-700">
          <div>
            <dt className="font-semibold">販売事業者</dt>
            <dd>らくしゅう運営</dd>
          </div>
          <div>
            <dt className="font-semibold">運営責任者</dt>
            <dd>別府 翔太</dd>
          </div>
          <div>
            <dt className="font-semibold">所在地</dt>
            <dd>東京都世田谷区世田谷1-10-15 グリューネ・ヴォーヌンク世田谷103</dd>
          </div>
          <div>
            <dt className="font-semibold">電話番号</dt>
            <dd>070-3966-6494</dd>
          </div>
          <div>
            <dt className="font-semibold">お問い合わせ先</dt>
            <dd>mii4a2501@gmail.com</dd>
          </div>
          <div>
            <dt className="font-semibold">販売価格</dt>
            <dd>各プラン紹介ページに表示された金額（税込）</dd>
          </div>
          <div>
            <dt className="font-semibold">商品代金以外の必要料金</dt>
            <dd>インターネット接続に必要な通信料金等はお客様のご負担となります。</dd>
          </div>
          <div>
            <dt className="font-semibold">支払方法</dt>
            <dd>Stripe を利用したクレジットカード決済</dd>
          </div>
          <div>
            <dt className="font-semibold">支払時期</dt>
            <dd>初回は申込時に課金され、以後は契約更新日に自動で課金されます。</dd>
          </div>
          <div>
            <dt className="font-semibold">サービス提供時期</dt>
            <dd>決済完了後、直ちに有料機能をご利用いただけます。</dd>
          </div>
          <div>
            <dt className="font-semibold">契約期間</dt>
            <dd>月額契約です。契約はお客様による解約手続きが完了するまで自動更新されます。</dd>
          </div>
          <div>
            <dt className="font-semibold">解約方法</dt>
            <dd>Stripe の請求ポータルから次回更新日前までに解約手続きを行えます。</dd>
          </div>
          <div>
            <dt className="font-semibold">解約後の利用</dt>
            <dd>解約後も、既に課金済みの契約期間満了までは有料機能をご利用いただけます。</dd>
          </div>
          <div>
            <dt className="font-semibold">返金について</dt>
            <dd>原則として日割り・月割りの返金は行いません。重複請求など当方起因の不具合が確認された場合は個別に対応します。</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
