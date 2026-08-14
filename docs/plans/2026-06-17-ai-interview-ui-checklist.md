# AI Interview UI Mock Comparison Checklist

Target:
- Route: `/ai-interview`
- Prompt: `UI-mock/ai-interview/pc/ai-interview-implementation-prompt.md`

Assets reviewed:
- `ai-interview-00-main-before-recording.png`
- `ai-interview-01-setup-modal-method.png`
- `ai-interview-08-feedback-modal-category.png`
- Other state images are referenced for recorder-state parity

## P0 Structure / Layout Physics
- [ ] Left existing dashboard sidebar remains visually consistent
- [ ] Center column is the primary interview workspace
- [ ] Right column is session history only
- [ ] Global page height is compressed enough to avoid large body scrolling
- [ ] Right history column has its own scroll container
- [ ] Top row includes `設定を変更` and right-sidebar toggle affordance

## P1 First Impression / Hierarchy
- [ ] `AI面接` title and subtitle appear at top of center area
- [ ] Compact setting summary row appears above progress
- [ ] Large green microphone CTA is the dominant focal element in idle state
- [ ] Text-entry affordance is absent
- [ ] Current question and interviewer intent are readable before the recorder

## P2 Component Parity
- [ ] Setup modal has 3 steps and clear current-step badge
- [ ] Step 1 supports `新規で設定する` vs `保存済み設定から選ぶ`
- [ ] Step 2 supports interview type / target company / target role
- [ ] Step 3 supports scenario-type tabs and category list with duration/question counts
- [ ] Progress row shows `質問 X / N`, progress bar, and `質問を読み上げる`
- [ ] Transcript preview panel exists in empty / live / confirmed forms
- [ ] Scenario overview chips show current category highlight
- [ ] Session cards show status badge, set name, scenario, counts, duration, updated/completed date
- [ ] Feedback modal has left answered-question list and right evaluation report sections

## P3 Visual Polish / Motion / Truthfulness
- [ ] Badge / border / shadow / radius reuse existing design tokens
- [ ] Recording state swaps to red CTA with timer and waveform treatment
- [ ] Transcribing state shows loading ring + `文字起こし中...`
- [ ] Evaluating state shows AI evaluation copy + loading ring
- [ ] Completed state shows success icon + `フィードバックを見る`
- [ ] First-run state does not seed fake past sessions, scores, or prior answers
- [ ] Past-session review mode is read-only or clearly separated from the active session

## Exact / Approximate / Unavailable Notes
- Exact:
  - Existing left sidebar should stay close to current app shell
  - Main column information order from the mock should be preserved
- Approximate:
  - Icons/illustrations may use closest existing Lucide/system assets
  - Waveform animation can be lighter than the mock if motion/accessibility requires it
- Unavailable / pending real backend:
  - Recording/transcription/evaluation can use safe client-side mock transitions where APIs are incomplete
  - Infinite history loading can be scaffolded with mock data and sentinel structure first
