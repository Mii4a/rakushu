# task.md

## 目的
らくしゅう開発で使う `rakushu-dev` 向けに、親agent と worker agent の実運用しやすい prompt テンプレートを整備する。

## 背景
- すでに `docs/agent-task-splitting.md` で「何を分割してよいか / 分割禁止か」は整理した。
- ただ、実際に multi-agent を回すには、親agent と各 worker にどう指示するかの定型文が必要。
- ユーザーは「通知機能だけを作る」ような単機能専用プランではなく、らくしゅう全般で再利用できる prompt 雛形を求めている。

## 今回のゴール
1. Lead / Orchestrator 用 prompt を作る
2. Analysis / UI / Platform / QA 用 worker prompt を作る
3. どの場面でどの prompt を使うかの使い分けを明文化する

## 非ゴール
- 実際の feature 実装
- profile の追加作成そのもの
- delegate_task の即時実行

## 成果物
- `docs/agent/rakushu-dev-agent-prompts.md`
- 必要に応じて task / plan / walkthrough の更新
