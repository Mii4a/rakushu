# home-demo specific GPT Image 2 prompts

対象:
- `src/components/home-demo.tsx`
- トップページの first-view と主要 feature block

共通前提:
- product: らくしゅう
- purpose: 求人票を貼ると、保存する価値があるかを整理してくれる日本語 Web アプリ
- reference vibe: nani.now のやわらかい淡色 SaaS 感
- must keep: 入力が主役、安心感、広い余白、白カード、淡い空色背景
- must avoid: 翻訳アプリ化、ロゴ模倣、exact layout copy、金融ダッシュボード感、情報過密

## Prompt A: Calm hero

Create a high-fidelity desktop web landing-page mockup for a Japanese product called "らくしゅう".

This is the home-demo screen of a job-hunting web app. The main action is pasting a job listing and immediately understanding whether it is worth saving.

Design a calm, soft, pastel-blue SaaS interface inspired by the airy feel of nani.now, but do NOT copy its branding, mascot, wording, or exact composition.

Requirements:
- Japanese interface text only
- very light sky-blue background
- centered hero composition
- huge Japanese headline
- large rounded white card below the headline
- inside the main card: a large textarea for job posting text on the left, and a soft evaluation preview on the right
- the preview should show overall rank, annual holidays, fixed overtime, bonus, and one warning point
- below the hero card: 4 soft feature cards
- lower section: compact FAQ card row
- low-pressure CTA button style
- cute but not childish
- implementation-friendly for Next.js + Tailwind

The product should feel trustworthy, emotionally safe, and practical for job hunting.

## Prompt B: Split focus

Create a high-fidelity desktop web UI mockup for "らくしゅう", a Japanese app that helps users evaluate job listings.

This version should make the relationship between input and output immediately obvious.

Requirements:
- soft pastel blue background with subtle radial highlights
- left panel: explanation, headline, soft CTA, 3 benefit blocks
- right panel: main workbench with job text input and analysis summary
- white translucent rounded cards, subtle shadows, thin borders
- Japanese copy only
- overall tone: calm, modern, lightweight, consumer-friendly
- the app should not look like enterprise HR software
- evaluation result should feel reassuring, not harsh
- keep the layout feasible in Tailwind CSS

Important:
- input and result should both be visible without scrolling
- emphasize "paste, judge, save" as the emotional flow
- no translation app symbols or semantics

## Prompt C: Soft workbench

Create a high-fidelity desktop web home-demo screen for "らくしゅう".

This direction is less like a marketing page and more like an immediate product workbench.

Requirements:
- pale blue background, white rounded panels, soft shadows
- top area split into 2 panels: left explanation, right interactive-looking job text input
- below: 2 summary cards showing rank and checklist
- below that: 3 value cards explaining the flow
- Japanese interface text only
- large bold Japanese headline
- the textarea must visually feel like the main hero object
- show sample job-post text and realistic extracted values
- CTA should be soft blue, not aggressive
- the mood should be calm, kind, and lightly optimistic

Avoid:
- exact imitation of nani.now
- heavy gradients
- dark mode
- visual clutter
- startup cliché illustrations

## Recommendation

If only one direction is generated first, start with Prompt C.

理由:
- らくしゅうの核機能を最もそのまま見せやすい
- 後で `/jobs/new` へ接続しやすい
- nani.now の入力主役感を借りつつ、翻訳アプリっぽさを避けやすい
