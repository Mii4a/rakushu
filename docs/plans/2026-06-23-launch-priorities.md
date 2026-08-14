# Launch priorities implementation plan

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

Goal: らくしゅうを『便利なAI機能集』ではなく『一社の選考を不安ごと完遂させる商品』としてローンチできる状態へ揃える。

Architecture: 既存の jobs / company-research / resume / ai-interview / criteria / onboarding / pricing を全面刷新せず、(1) 商品メッセージ、(2) クレジットと不足状態の可視化、(3) 4機能の導線、(4) parser改善ループの4層で再編する。苦労した既存UIはなるべく温存し、サイドバー・CTA・完了導線・不足導線で一体感を作る。

Tech Stack: Next.js App Router, TypeScript, Drizzle/Turso, Stripe, Tailwind, Vitest.

---

## 現状確認メモ（2026-06-23）

- `src/app/pricing/page.tsx`
  - 価格表・無料枠・企業研究/AI面接説明は存在
  - `CREDIT_PACKS` を import しているが、このページ断面ではクレジット販売/残量体験まで繋がっていない
  - 文言は『判断作業台』寄りだが、『一社完遂パック』訴求には未到達
- `src/lib/plans.ts`
  - `monthlyAiCredits`, `CREDIT_PACKS`, `AI_CREDIT_COSTS` が定義済み
- `src/lib/usage/counters.ts`
  - `getAiCreditsUsed`, `consumeAiCredits` 実装済み
  - ただし現時点で `consumeAiCredits` の呼び出しが見当たらず、運用未接続
- `src/components/dashboard-sidebar.tsx`
  - サイドバー共通化済み。`footerContent` を差し込めるので、クレジット残量表示の本命候補
- `src/app/onboarding/page.tsx` / `src/components/onboarding/onboarding-experience.tsx`
  - 長めの onboarding UI は既にある
  - ただし `deferredRoles` / `deferredSkills` が残っており、詳細設定の核が未完
- `src/actions/company-research-actions.ts`
  - 企業研究の保存上限は server action 側でチェック済み
  - 生成ロジックは `buildCompanyResearchResultFromQuery` ベースで、手動品質確認が必要
- `src/actions/ai-interview-session-actions.ts`
  - AI面接セッション上限は server action 側でチェック済み
  - セッション資産も保存済み。UI破壊より導線改善を優先すべき
- `src/actions/resume-actions.ts`
  - レジュメ generator はある
  - AI添削専用フローは未実装
- `src/components/resume-workspace-shell.tsx`
  - NOTE 文言が『Pro向け』になっている一方、`PLAN_LIMITS` では全プラン `resumeWorkspace: true`
  - ローンチ前に仕様/文言/実装の整合が必要
- `src/app/criteria/page.tsx`
  - 共有基準の閲覧・保存・所有テンプレート土台あり
  - 「みんなで共有するUI」の核にできる
- `src/app/internal/parser-feedback/page.tsx` と `src/app/beta/page.tsx`
  - parser 失敗回収の内部導線と β応募導線は既に存在
  - ユーザー-facing の失敗時CTA整備で価値が上がる

---

## 優先順位まとめ

### A. ローンチ前の必須

1. 商品定義の統一
   - pricing / onboarding / 主要CTA を『一社完遂』メッセージへ揃える
2. クレジットの見える化
   - 残量表示、不足状態、アップグレード/購入CTA
3. 4機能の最低連携
   - 求人チェック → 企業研究 → レジュメ → AI面接
4. Onboarding の詳細化
   - deferred 項目を解消し、初回導線に活かす
5. parser改善の回収導線
   - 失敗時の案内、内部回収、β協力導線

### B. ローンチ前に方針決定が先

1. クレジットを何に使うか
   - 月次付与を AI機能共通通貨にするか
   - 研究/面接/添削ごとの回数制と併用するか
2. Starter の売り方
   - 本当に『一社完遂パック』で固定するか
   - 企業数・期間・機能範囲をどう明文化するか
3. Streamlabs風UIの採用範囲
   - デザイン言語だけ借りるか
   - ナビ構造まで寄せるか
   - 既存AI面接UIは温存するか

### C. ローンチ後でもよい

1. 大規模な全面UI刷新
2. クレジットパック単体販売の高度な導線
3. 共有基準の統計やSNS的拡張
4. parser フィードバックの一般公開ダッシュボード

---

## 実装トラック

### Track 1: 商品メッセージと料金の整合

Objective: 料金・CTA・不足状態の言葉を『AI機能の説明』から『不安の解消と一社完遂』へ変える。

Files:
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/lib/plans.ts`
- Modify: `src/components/checkout-button.tsx`（必要なら CTA 文言拡張）
- Modify: `src/app/page.tsx`（必要ならLP訴求整合）
- Test: pricing まわりの snapshot / 文言テスト追加先

Tasks:
1. 現行 pricing 文言を棚卸しし、『機能説明』『不安訴求』『完遂訴求』に分類する
2. Starter を『一社完遂パック』として表現する文案を決める
3. Free / Starter / Plus / Pro の役割を再定義する
4. 不足状態 CTA の共通文言パターンを作る
5. 価格・文言・プラン説明のテストを追加する
6. pricing ページを更新する
7. build / test で確認する

Sign-off:
- 料金ページだけ読んでも『何を買うサービスか』が一文で分かる
- Starter が最初の購入単位として自然

### Track 2: クレジットの可視化と不足導線

Objective: 既存の credit 定義を、ユーザーが認知できる体験にする。

Files:
- Modify: `src/components/dashboard-sidebar.tsx`
- Modify: `src/lib/usage/counters.ts`
- Modify: `src/app/company-research/page.tsx`
- Modify: `src/app/ai-interview/page.tsx`
- Modify: `src/app/resume/page.tsx` または関連 shell
- Modify: `src/actions/...`（実際に credit 消費を結線する箇所）
- Test: usage counter / page rendering tests

Tasks:
1. credit を sidebar footer に置く案とヘッダーに置く案を比較し、まず sidebar footer を採用する
2. 現在値取得 helper を作る
3. `consumeAiCredits` をどの機能に接続するか決める
4. 研究 / 面接 / 添削の不足時メッセージを共通化する
5. 残量・不足CTAの UI を追加する
6. zero-credit 時の CTA を pricing か checkout に接続する
7. テストを追加する

Sign-off:
- ユーザーが『あと何回/どこで止まるか』を迷わない
- credit 未接続のまま見せかけ表示になっていない

### Track 3: 一社完遂導線の最低連携

Objective: 4機能が孤立せず、最低1本の応募準備フローとして通るようにする。

Files:
- Modify: `src/app/jobs/new/page.tsx`
- Modify: `src/app/jobs/[id]/page.tsx`
- Modify: `src/app/company-research/page.tsx`
- Modify: `src/app/resume/page.tsx`
- Modify: `src/app/ai-interview/page.tsx`
- Modify: 関連 components / action files
- Test: integration-like UI tests or action tests

Tasks:
1. 『最初の1社で何を押すか』を決める
2. 求人詳細 or 保存済み求人から企業研究へ進む CTA を作る
3. 企業研究結果からレジュメ/AI面接へ進む CTA を作る
4. レジュメ画面に『この企業向けに詰める』導線を足す
5. AI面接に企業文脈を持って入る導線を足す
6. 空状態 / 初回状態 / 途中状態の見せ方を分ける
7. 最低1本の手動 smoke を定義する

Sign-off:
- 新規ユーザーが『何から始めるか』で詰まらない
- 保存した研究・レジュメ・面接が孤立せず次アクションへ繋がる

### Track 4: Onboarding 詳細化

Objective: onboarding を単なる挨拶画面ではなく、初回体験の投資と精度向上の両方に効く設定にする。

Files:
- Modify: `src/components/onboarding/onboarding-experience.tsx`
- Modify: `src/lib/onboarding/draft.ts`
- Modify: `src/lib/onboarding/profile.ts`
- Modify: `src/actions/onboarding-actions.ts`
- Modify: onboarding 利用先の分岐ロジック
- Test: onboarding draft / persistence tests

Tasks:
1. deferredRoles / deferredSkills を本実装へ置き換える
2. 詳細質問の並びを『答えやすい → 深い』順に再構成する
3. onboarding 完了後の遷移先を『最初の求人チェック』へ寄せる
4. 回答内容を求人判定やCTAに反映する最小ルールを決める
5. 長さによる離脱が起きすぎないよう progress / skip / resume を点検する
6. テストを追加する

Sign-off:
- 長めでも『ちゃんと面倒を見てくれそう』に感じる
- 回答が後続画面で実際に使われる

### Track 5: parser 回収ループと基準共有の最低完成

Objective: parser 失敗を放置せず改善へ回し、基準共有を核機能として見せられる状態にする。

Files:
- Modify: `src/app/jobs/new/page.tsx`
- Modify: `src/actions/job-actions.ts`
- Modify: `src/app/internal/parser-feedback/page.tsx`（必要なら表示改善）
- Modify: `src/app/beta/page.tsx`
- Modify: `src/app/criteria/page.tsx`
- Modify: 関連 components
- Test: parser feedback / criteria access tests

Tasks:
1. parser 失敗時のユーザー向けメッセージを設計する
2. β協力導線に落とす条件を決める
3. criteria で『共有基準』の見え方を強める
4. 内部 feedback ページで triage しやすい情報が揃っているか点検する
5. フィードバック収集から fixture 化までの運用手順を docs に残す

Sign-off:
- parser が失敗しても『終わり』ではなく改善ループへ流れる
- 基準共有が核機能として説明できる

---

## 推奨の実行順

1. Track 1 商品メッセージ
2. Track 2 クレジット可視化
3. Track 4 Onboarding 詳細化
4. Track 3 一社完遂導線
5. Track 5 parser 回収 / 基準共有

理由:
- 先に『何を売るか』を固めないと CTA と onboarding がぶれる
- credit は pricing と各AI機能の接点なので早めに定義が必要
- onboarding は初回ユーザーの入口なので、導線実装より先に設計した方が後戻りが少ない

---

## 明確なローンチ完了条件

- pricing / onboarding / 主要CTA が『一社完遂』の同じ物語を話している
- 残クレジットと不足CTAが主要画面で見える
- 求人チェック → 企業研究 → レジュメ → AI面接 の最低1本の実導線が通る
- onboarding の詳細設定が deferred で残っていない
- parser 失敗時の回収先が定義されている
- `npm test` と `npm run build` が通る

---

## 注意点

- AI面接の既存UIは資産なので壊さない
- レジュメプレビューは既存フローを守り、AI添削は横に足す
- `resumeWorkspace` の仕様と文言の不整合を放置しない
- credit は『表示だけ実装』を禁止。必ず source of truth と結線する
- Streamlabs風への寄せはデザイン言語の借用に留め、全面UI破壊を避ける
