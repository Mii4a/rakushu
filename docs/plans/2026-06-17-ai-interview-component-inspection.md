# AI Interview Current Component Inspection

Target file:
- `src/components/ai-interview/ai-interview-mock-experience.tsx`

Purpose:
- 実装前に、現状の責務集中ポイントと安全な分割境界を固定する。

## 現状サマリ

`ai-interview-mock-experience.tsx` は約 972 行あり、次の責務を 1 ファイルで同時に持っている。

1. app shell / topbar / sidebar footer 描画
2. AI面接設定カード描画
3. current session / selected session / reviewed answer の導出
4. text input / voice input の二系統 UI
5. MediaRecorder 操作
6. voice upload / poll / confirm の非同期制御
7. saved session 一覧 UI
8. per-answer list UI
9. right-side feedback cards UI

今回の要件では 2, 4, 7, 9 が大きく変わるので、このまま継ぎ足すと崩れる。

## 現在の主要 line block

- `68-92`: sidebar footer 専用 presentational helper
- `94-117`: date / question-index helper 群
- `130-202`: local state と derived state
- `204-267`: saved attempt を session state に反映するロジック
- `270-449`: voice flow / session selection / save handlers
- `451-517`: top shell + 現在の設定カード
- `519-809`: main column（質問、録音、回答 textarea、session answers）
- `812-965`: right column（saved sessions + feedback cards + mascot card）

## 現状態と新要件の衝突点

### 1. input mode が text/voice 二系統になっている
Current:
- `inputMode = "text" | "voice"`
- `テキストで入力` / `音声で回答` トグルが main recorder card 内にある

Conflict:
- 新モックでは text-entry affordance 自体を消す必要がある
- transcript preview は残すが、入力方式としての text mode は不要

Action:
- `inputMode` を消し、録音→文字起こし確認→確定に統一する
- `answerDraft` の直接入力用途は、voice transcript review fallback に限定するか廃止を検討する

### 2. 上部設定 UI が inline card になっている
Current:
- `451-517` に select 3つ + `設定を変更`

Conflict:
- 新要件では compact setting summary + modal 3 step
- main column 上部に大きな form は置かない

Action:
- inline settings card を削除
- summary row component と setup modal component に責務分離

### 3. right column が履歴専用ではない
Current:
- saved sessions
- score
- strengths
- improvements
- follow-ups
- mascot card

Conflict:
- 新要件では right column は `セッション履歴` 専用
- feedback は category completion modal へ移す

Action:
- 右カラムから feedback cards 一式を撤去
- `AiInterviewSessionHistorySidebar` に限定
- feedback display は modal component に再配置

### 4. current session と past-session review の境界が弱い
Current:
- `selectedSessionId !== currentSessionId` で review mode 判定
- ただし UI は同じ面に feedback / answer editor / next button が混在

Conflict:
- 新モックでは current flow と履歴 review をもっと明確に分けたい
- past-session review は read-only が原則

Action:
- `viewMode: "active" | "history"` を明示化した方が安全
- `selectedHistorySessionId` と `activeSessionId` を分ける

### 5. category / scenario 概念がまだない
Current:
- 質問は `AI_INTERVIEW_QUESTIONS` の直列 10 問
- settings も `interviewType / targetCompany / questionSet` 程度

Conflict:
- 新要件では scenario type, category ordering, duration, sample question, current category highlight が必要
- category completion modal の条件も必要

Action:
- `src/lib/ai-interview/setup-scenarios.ts` を新設し、質問のカテゴリ帰属を定義する
- persistence か client state で `currentCategoryIndex` / `selectedCategories` を扱う

## 推奨分割境界

### A. `AiInterviewLayoutShell`
Responsibility:
- page shell
- topbar
- left sidebar
- right sidebar open/close button placement
- content area height / overflow contract

Should own:
- `leftSidebarOpen`
- `rightSidebarOpen`

Should NOT own:
- recorder state
- session save logic

### B. `AiInterviewSetupModal`
Responsibility:
- initial setup 3 steps
- create/select setting set
- scenario-type tab + category list

Should own or receive:
- `setupModalOpen`
- `setupStep`
- draft setup values

### C. `AiInterviewRecorderPanel`
Responsibility:
- progress row
- question card
- interviewer intent
- large mic CTA
- state-dependent copy for idle / recording / transcribing / evaluating / completed
- transcript preview panel
- scenario strip

Should receive:
- active question
- progress info
- recording state
- transcript text
- callbacks for start/stop/confirm

### D. `AiInterviewSessionHistorySidebar`
Responsibility:
- session list only
- independent scroll region
- status badge / set name / scenario / counts / updatedAt
- lazy-load sentinel helper copy

Should receive:
- sessions
- active session id
- selected history session id
- onSelectSession

### E. `AiInterviewFeedbackModal`
Responsibility:
- category completion report only
- answered-question summaries on left
- score/strengths/improvements/next-focus/follow-ups on right
- close / next category actions

Should receive:
- current category summary
- answered questions in category
- score payload

## State ownership proposal

Keep in parent container for now:
- `activeSessionId`
- `selectedHistorySessionId`
- `savedSessions`
- `recordingState`
- `voiceTranscriptDraft`
- `feedbackModalOpen`
- `setupModalOpen`
- `setupStep`
- scenario/category progression

Move down as props only:
- recorder visual state
- history card rendering
- modal layout

## Immediate implementation implication

Before visual rebuild, the safest first code move is:
1. add scenario/setup data module
2. add thin presentational components for shell / history sidebar / setup modal / feedback modal
3. shrink `ai-interview-mock-experience.tsx` into a parent orchestrator

That keeps current save/voice logic reachable while replacing the UI surface in pieces instead of rewriting everything in one diff.
