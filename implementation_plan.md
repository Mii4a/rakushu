# implementation plan

1. 現状確認
   - resume template の tracked path を git 上で確認する
   - failing test を再実行し、古い `UI_samples` 参照で落ちていることを再現する

2. パス解決ロジック修正
   - `src/lib/resume/xlsx-template.server.ts` で template path resolver を追加
   - 優先順は `UI-mock/resume/resume_template.xlsx` → `UI_samples/resume/resume_template.xlsx`
   - どちらも無いときは checked paths を含む明示的エラーを投げる

3. 再発防止テスト追加
   - 既存の workbook 生成テストが現行 fixture で通ることを維持する
   - template path が両方欠落した場合に、明示的エラー文言を返すテストを追加する

4. 検証
   - `npm test -- --run src/lib/resume/xlsx-template.server.test.ts`
   - `npm run typecheck`
   - `npm run lint`

5. Git / PR 反映
   - fix branch に commit
   - push 済み PR #16 を更新
