# Walkthrough: guided private beta enablement

## 1. What this work is for
- らくしゅうを「少人数の案内制β」に出す前の最後のガードレール整備
- 公開ベータの完成ではなく、初期ユーザーから安全に学びを得るための整備

## 2. What is being changed
1. β募集文の期待値を固定する
2. 初期βで受ける入力の範囲を明文化する
3. βフィードバック回収ループを運用化する
4. `本文未記載 / 要確認` の説明を主要画面で揃える
5. launch checklist を作る

## 3. Why now
- build/test は通っており guided private beta は始められる水準
- ただし public beta にはまだ早い
- 直近の事故ポイントは parser 精度そのものより、ユーザーが「どこまで信用してよいか」を読み違えること

## 4. User-facing policy
- まだ改善中のβ版であることを明示する
- すべての求人媒体で完全対応とは言わない
- 困りごとの強い人から案内する
- thin-input / low-visibility row はまず input thinness として説明する

## 5. Missing-item wording
- `本文未記載`
  - 意味: 元の求人文に比較材料が見当たらない
- `要確認`
  - 意味: 書かれていそうだが自動整理が不安定

## 6. Verification
- `npm test`
- `npm run build`
- βページの文言目視確認
- 求人入力 / 保存画面の helper copy 目視確認

## 7. Done judgment
- βページの期待値調整が入っている
- input scope docs がある
- feedback loop docs がある
- missing-item helper copy が主要画面にある
- launch checklist がある
- build/test green
