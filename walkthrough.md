# walkthrough.md

## 今回の作業

らくしゅう開発で再利用できる agent prompt テンプレートを作る。
前回作った `docs/agent-task-splitting.md` は「分割判断のルール」だったので、今回はその実行版として「親agent と worker に何を言うか」を固める。

## 進め方

1. 既存の分割運用表と AGENTS.md を読む
2. 親agent に持たせる責務を明確にする
3. worker を Analysis / UI / Platform / QA に分ける
4. それぞれの prompt をコピペしやすい形で docs に書く
5. 最後に使い方と禁止例を添える

## 今回の判断軸

- 役割ごとに触る責務が分かれているか
- worker に渡すべき禁止事項が明確か
- 同じ prompt を別 feature でも再利用できるか
- Hermes の `delegate_task` や別セッション起動にそのまま流せるか

## 期待する成果

- Lead agent が毎回ゼロから指示文を考えなくてよくなる
- worker の責務逸脱やスコープ膨張を抑えやすくなる
- らくしゅう全般で使える multi-agent の基本形ができる
