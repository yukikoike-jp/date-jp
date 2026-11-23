# アプリ向け API v1

Flutter アプリが呼ぶ API。中身は `app/actions.ts` の関数を呼ぶだけで、Web と同じ決まりで動く。形はテスト(`app/api/v1/v1.test.ts`)で守る。

- 場所: `https://www.tsudoro.com/api/v1`(開発は `npm run dev` の `http://localhost:3000/api/v1`。仮DB で動く)
- 送る・返すのは JSON(UTF-8)
- 成功は `{ "ok": true, ... }`。失敗は `{ "ok": false, "error": "画面にそのまま出せる日本語の文" }`。見つからないときは 404、それ以外の失敗は 400
- 幹事の鍵: `Authorization: Bearer <adminToken>`
- 参加者の鍵: 直すときはボディの `answerId` と `token`、読むときは `X-Answer-Token` ヘッダー
- 時刻は「0時からの分」(19:00 → 1140)。日付は `YYYY-MM-DD`。金額は円の整数
- 項目を消すとき・意味を変えるときは v2 を作る(ストアのアプリは古い版が長く残るため)。足すだけなら v1 のまま

## 会

### `POST /parties` 会を作る
```json
{ "title": "忘年会", "audience": "private", "dates": ["2026-12-04"], "start": 1140 }
```
- `audience`: `private`(プライベート)か `worker`(仕事)
- 201 `{ "ok": true, "id": "3beyts4x8a", "adminToken": "..." }`。`adminToken` は端末に安全に保存する(DB にはハッシュしか残らないので、なくすと戻せない)

### `GET /parties/:id` 会の中身
- 幹事の鍵は付けても付けなくてもよい。中身は同じで、`admin` だけが変わる
- 200 `{ "ok": true, "party": {...}, "summary": {...}, "shops": [...], "otherArea": false, "relaxed": null, "basis": [...], "admin": true, "notice": null, "pr": false, "share": { "invite": "...", "decided": null } }`
  - `summary`: 集計(`lib/summary.ts` の `Summary`)。1人ずつの予算は入らない
  - `shops`: おすすめのお店。お店へのリンクは必ず `https://www.tsudoro.com/go/<会のid>/<お店のid>` を外のブラウザで開く(紹介料を数えるため)
  - `share.invite`: 招待の文。`share.decided`: 決まったときの文(決まっていなければ null)
  - `notice`: 予約のときにお店に伝えること(苦手なもの・お酒を飲まない人の数)。なければ null
  - `pr`: お店のリンクが提携リンクか。true なら「#アフィリエイト広告」をはっきり出す
- 404 会がない

### `POST /parties/:id/decision` 日にちとお店を決める(幹事)
```json
{ "date": "2026-12-04", "shopId": "J001234567" }
```
- `shopId` は省略できる。`{ "clear": true }` で決定を取り消す

### `PUT /parties/:id/must` 必ず来てほしい人(幹事)
```json
{ "names": ["部長"] }
```
- 答えた人の名前だけを受け付ける。10人まで

### `GET /parties/:id/attendees` 会計に読み込む、行く人(幹事)
- 200 `{ "ok": true, "title": "忘年会", "date": "2026-12-04", "attendees": [{ "name": "山田", "soft": false }] }`(`soft` = お酒を飲まない)
- 404 まだ決まっていない、または幹事の鍵が合わない

### `POST /parties/statuses` 作った会の一覧
```json
{ "ids": ["3beyts4x8a"] }
```
- 30件まで。200 `{ "ok": true, "statuses": { "3beyts4x8a": { "decision": null, "answered": 3, "going": 0, "audience": "private" } } }`。なくなった会は入らない

## 回答

### `POST /parties/:id/answers` 答える・直す
```json
{
  "answer": { "name": "山田", "dates": { "2026-12-04": "ok" }, "stay": 1320, "budget": 4000, "areas": [], "station": null },
  "answerId": "(直すときだけ)",
  "token": "(直すときだけ)"
}
```
- `dates` の値は `ok` / `maybe` / `no`。項目の意味と選べる値は `lib/validation.ts` の `parseAnswer`
- 200 `{ "ok": true, "answerId": "...", "token": "..." }`。2つとも端末に保存する(直すときに使う)
- 同じ名前の人がいると 400

### `GET /parties/:id/answers/:answerId` 自分の回答を読む
- ヘッダー `X-Answer-Token: <token>`
- 200 `{ "ok": true, "answer": {...} }`。404 鍵が合わない

## お店・駅

### `POST /shops/search` お店を探す
- ボディは `findShops` の入力と同じ(`station`・`genres`・`budget`・`privateRoom`・`freeDrink`・`smoking`・`second`・`audience`)
- 200 `{ "ok": true, "shops": [...], "otherArea": false, "relaxed": null, "pr": true }`(`pr` = お店のリンクが提携リンクか)

### `GET /stations?q=仙台` 駅を探す
- 200 `{ "ok": true, "stations": [{ "name": "仙台", "pref": "宮城県", "lat": 38.26, "lng": 140.88 }] }`(8件まで)

## まだないもの
- 通知の宛先の登録(`POST /devices`)。DB の表を足してから作る(`docs/flutter-plan.md` の「通知」)
- 集金・Play / Support・購入(2段目)
