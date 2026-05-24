# Job Fixtures

- すべて匿名化済み本文のみを置く
- 会社名、住所、URL、担当者名、電話番号はダミー化する
- parser failure を再現するのに必要な行だけ残す
- 命名は `phase{n}-{failure-shape}-anon.txt` を使う
- 新しい fixture を追加したら、対応する parser test を同時に追加する
