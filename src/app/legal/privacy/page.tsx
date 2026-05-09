export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <section className="page-stack">
      <article className="panel space-y-4">
        <h1 className="section-title">プライバシーポリシー</h1>
        <p className="text-sm text-slate-700">らくしゅうは、ユーザーの個人情報を以下の方針で取り扱います。</p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>取得情報: アカウント情報、利用状況、問い合わせ内容など。</li>
          <li>利用目的: サービス提供、品質改善、不正防止、問い合わせ対応。</li>
          <li>第三者提供: 法令に基づく場合を除き、同意なく提供しません。</li>
          <li>委託先: 決済処理をStripe等の外部事業者へ委託する場合があります。</li>
          <li>開示・訂正・削除: 本人確認後、合理的範囲で対応します。</li>
        </ul>
      </article>
    </section>
  );
}
