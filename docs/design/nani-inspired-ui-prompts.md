# Nani-inspired UI prompts for GPT Image 2

目的:
- nani.now/ja の「やわらかい淡色 SaaS UI」の雰囲気を参照しつつ、らくしゅう向けの独自 UI モックを生成する。
- そのまま実装するための視覚基準を先に作る。

共通ディレクション:
- product: Japanese job-hunting web app named "らくしゅう"
- target user: 就活中で、求人票を見比べて保存・整理したい人
- mood: calm, friendly, trustworthy, airy, soft SaaS
- visual style: pastel sky-blue background, large rounded white cards, wide spacing, low-pressure CTA, minimal chrome, soft shadows, cute but not childish
- typography: clean Japanese sans-serif, large hero title, short supportive copy, low visual noise
- layout: mobile-first feeling, centered single-column hero, optional secondary cards below, occasional 2-column sections on desktop
- avoid: translation app semantics, copy of Nani logo/mascot, exact layout duplication, dense enterprise dashboard style, dark mode, neon gradients, medical app look, banking app look
- implementation intent: feasible in Next.js + Tailwind, no impossible 3D glass sculpture, no overly artistic shapes that are hard to code

---

## Prompt 1: Landing page / top page

Design a high-fidelity web UI mockup for a Japanese job-hunting assistant web app called "らくしゅう".

The app helps users paste a job listing, automatically evaluate the job posting, and save only the good opportunities.

Create a soft modern SaaS landing page inspired by the calm, airy feel of nani.now, but do NOT copy its branding or exact composition.

Visual direction:
- very light sky-blue page background
- central hero focused on a large input panel where users paste a job listing
- oversized rounded white card with subtle border and soft shadow
- large Japanese headline, short friendly subcopy
- primary CTA should feel gentle, not aggressive
- supporting feature cards below the hero
- use wide spacing and low information density
- mix white cards with slightly tinted blue sections
- cute and warm, but still credible and practical

Product-specific content to show in the mock:
- headline about pasting a job listing and instantly understanding whether it is worth saving
- a textarea for job posting input
- a secondary card that previews evaluation output such as overall rank, holidays, overtime, bonus, warning points
- 3 to 4 feature cards: evaluate jobs, save only good jobs, compare conditions, manage application progress
- a calm FAQ section lower on the page

Design constraints:
- Japanese UI text only
- no translation-related icons or wording
- no stock-photo-heavy marketing page
- no overly corporate dashboard
- keep it implementation-friendly for Tailwind CSS

---

## Prompt 2: Job input page / ranking flow

Design a high-fidelity authenticated app page for "らくしゅう", a Japanese web app for evaluating job listings.

This screen is the main workflow page where a user pastes a job listing, optionally adds company/title/location details, then runs analysis and saves the result.

Visual direction:
- same soft pastel sky-blue base background
- white rounded cards with generous spacing
- main focus should be the input area, not navigation chrome
- subtle progress/step indicator near the top
- very soft shadows, thin borders, calm typography
- make the page feel emotionally safe and easy to start

UI blocks to include:
- page title and short explanation
- step indicator with 3 steps: paste text, add optional details, analyze and save
- large textarea card as the primary surface
- smaller secondary fields for company name, job title, source URL, location
- an analysis summary preview card on the side or below
- a gentle primary button for analyzing/saving
- compact sidebar or top navigation, but visually quiet

What the analysis preview should suggest:
- overall rank
- annual holidays
- fixed overtime
- bonus
- retirement allowance
- missing or warning items

Avoid:
- making it look like a form-heavy admin page
- making the CTA bright red/orange
- cramped grids
- too many badges

---

## Prompt 3: Dashboard

Design a high-fidelity dashboard screen for "らくしゅう", a Japanese job-hunting organizer.

The dashboard should help users understand what to do next with their saved job opportunities, without feeling stressful.

Visual direction:
- soft pale blue canvas
- quiet white cards with large rounded corners
- airy spacing and a reassuring tone
- elegant hierarchy instead of dense metrics
- looks modern and consumer-friendly, not enterprise BI

Include these sections:
- greeting header
- one main guidance card: what to do next
- 3 soft summary cards: saved jobs, analyses used this period, upcoming actions
- recent saved jobs list with rank/status chips
- small card for current plan / usage limit
- compact side navigation

Important tone:
- reduce pressure
- make job search feel organized, not gamified
- no harsh warning colors unless necessary

Avoid:
- dark sidebars
- overly colorful KPI blocks
- crowded tables across the whole screen

---

## Prompt 4: Compare page

Design a high-fidelity compare page for "らくしゅう", where users compare saved job opportunities side by side.

Visual direction:
- keep the same soft blue ecosystem as the rest of the app
- the comparison should still feel readable and calm despite higher information density
- white cards on pale background
- rounded containers, subtle dividers, soft chip styles

Include:
- page heading and short explanation
- 3 soft insight cards at top: shortest commute, most holidays, needs review
- a comparison table/card layout showing multiple job opportunities
- rows or modules for overall rank, commute time, annual holidays, fixed overtime, bonus
- links/buttons for seeing job details

Design requirement:
- balance clarity and softness
- avoid spreadsheet harshness
- keep it realistic to build with Tailwind and semantic HTML

Avoid:
- overly complex data visualization
- strong gradients behind tabular data
- financial terminal look

---

## Recommended output settings

- aspect ratio candidates:
  - landing: 16:10 or 3:2
  - app screens: 16:10
- ask for:
  - high-fidelity product UI mockup
  - desktop web app screenshot
  - Japanese interface text
  - clean implementation-friendly layout

## How to use these outputs

1. Generate 2 to 4 variations per prompt.
2. Pick one visual direction that best matches らくしゅう's core flow.
3. Extract from the chosen mock:
   - page background color
   - card radius
   - shadow strength
   - section spacing
   - button style
   - input style
   - sidebar quietness level
4. Convert those into Tailwind tokens/components before editing individual screens.
