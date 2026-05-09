export default function RefundPage() {
  return (
    <section className="page-stack">
      <article className="panel space-y-4">
        <h1 className="section-title">返金・キャンセルポリシー</h1>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>サブスクリプションはいつでも次回更新日前まで解約できます。</li>
          <li>解約後も、契約期間終了日までは有料機能を利用できます。</li>
          <li>原則として、日割り・月割りの返金は行いません。</li>
          <li>重複請求など当社起因の不具合が確認された場合は個別に返金対応します。</li>
          <li>返金に関するお問い合わせはサポート窓口までご連絡ください。</li>
        </ul>
      </article>
    </section>
  );
}
