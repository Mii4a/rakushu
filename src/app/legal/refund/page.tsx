export const dynamic = "force-dynamic";

export default function RefundPage() {
  return (
    <section className="page-stack">
      <article className="panel space-y-4">
        <h1 className="section-title">返金・キャンセルポリシー</h1>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>有料プランは月額サブスクリプションです。いつでも次回更新日前まで解約できます。</li>
          <li>解約後も、既に課金済みの契約期間終了日までは有料機能を利用できます。</li>
          <li>デジタルサービスの性質上、原則として日割り・月割り・途中解約による返金は行いません。</li>
          <li>重複請求、誤請求、当方起因の技術的不具合など、当方に責のある問題が確認された場合は個別に返金対応します。</li>
          <li>返金の可否判断にあたって、決済日時、請求内容、利用状況その他必要情報の確認をお願いする場合があります。</li>
          <li>返金・請求に関するお問い合わせは、特定商取引法に基づく表記ページ記載の連絡先までご連絡ください。</li>
        </ul>
      </article>
    </section>
  );
}
