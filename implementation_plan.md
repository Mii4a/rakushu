# implementation_plan.md

# らくしゅう rakushu-dev agent prompt テンプレート整備計画

## Goal
らくしゅう開発で毎回使い回せる、親agent と worker agent の prompt テンプレートを文書化し、multi-agent 運用の再現性を上げる。

## Architecture
既存の分割運用表を前提に、役割ごとに prompt を固定する。親agent には分配・依存関係管理・gate 管理を担当させ、worker には Analysis / UI / Platform / QA の責務ごとの禁止事項と完了条件を持たせる。Hermes の `delegate_task` と相性が良いよう、コピペしやすい形で記述する。

## 対象
- `/home/openclaw/rakushu/docs/agent-task-splitting.md`
- `/home/openclaw/rakushu/AGENTS.md`
- `/home/openclaw/rakushu/docs/agent/*.md`
- 出力先: `/home/openclaw/rakushu/docs/agent/rakushu-dev-agent-prompts.md`

## 実施ステップ

### Step 1: 要件の整理
- 既存の分割ルールと ownership 原則を読み直す
- 既存 agent docs の粒度を確認する
- 親agent と worker に必要な責務を分ける

### Step 2: 親agent prompt を作る
- 依存グラフ作成
- owner 割当
- task 分解
- review gate
- stop 条件
を含める

### Step 3: worker prompt を作る
- Analysis worker
- UI worker
- Platform worker
- QA worker
の4種を作る

### Step 4: 使い方を添える
- どの task でどの worker を使うか
- どういう順番で投げるか
- 避けるべき使い方
をまとめる

## 完了条件
- `docs/agent/rakushu-dev-agent-prompts.md` が作成されている
- 親agent と 4種の worker prompt がコピペ可能な形で入っている
- らくしゅうでの使い分けと禁止例が明記されている
