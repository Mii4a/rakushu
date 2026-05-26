# Guided Private Beta Enablement Plan

Goal: らくしゅうを少人数の案内制β募集に出せるようにし、誤解を減らしながら初期ユーザーの学びを回収できる状態にする。

Current focus:
- public beta の完成ではなく guided private beta の成立
- parser fallback 追加ではなく、期待値調整・対象入力の明文化・フィードバック運用・missing-item説明の統一
- 「本文未記載」と「要確認」の違いをユーザーに分かる形で出す

Tracks:

## Track 1: β募集文の期待値固定
- Modify `src/app/beta/page.tsx`
- Modify `src/components/beta-intake-form.tsx`
- 追記する要点:
  - 改善中のβ版
  - すべての求人媒体で完全対応ではない
  - 困りごとの強い人から案内
  - 向いている人 / 向いていない人

Success condition:
- βページだけ読んでも、今が「完成版ではなく案内制β」だと伝わる

## Track 2: 初期βで受ける入力の運営ルール化
- Create `docs/beta-user-ops.md`
- 強い入力例 / 弱い入力例 / 対応ルールを整理
- weak-input は parser bug backlog に直結させず、まず input thinness として扱う

Success condition:
- 初期ユーザーから来た求人を「今の対象か / 想定外か」で即座に切れる

## Track 3: βフィードバック回収ループの運用化
- Update `docs/beta-intake-and-traction-spec.md`
- Create `docs/beta-feedback-review-loop.md`
- weekly KPI / qualitative bucket / escalation path を定義

Success condition:
- 週次で何を見るか、どこに分類するか、誰が次アクションを決めるかが docs で分かる

## Track 4: missing-item説明の主要画面統一
- Modify `src/components/job-create-form.tsx`
- Modify `src/app/jobs/page.tsx`
- If useful, add shared explainer component under `src/components/`
- 文言:
  - `本文未記載`: 元の求人文に比較材料が見当たらない
  - `要確認`: 書かれていそうだが自動整理が不安定

Success condition:
- 入力画面と保存後画面の両方で、missing-item表示の意味を短く説明できる

## Track 5: beta launch checklist
- Create `docs/beta-launch-checklist.md`
- hard gate / soft gate / no-go を分ける

Success condition:
- 募集前判断を感覚でなく checklist で回せる

Verification:
- `npm test`
- `npm run build`
- βページと求人画面の文言差分を目視確認
