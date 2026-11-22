# Flutter アプリの実装方針(Issue #1 ネイティブアプリにする)

担当: Oe-Shota / 作成: 2026-11-22

## 結論

- **Flutter アプリは「幹事の道具箱」として作り、データと決めるロジックは今の Next.js サーバーに残す。** アプリは新しく作る REST API(`/api/v1/...`)だけを呼ぶ。Supabase には直接つながない
- **参加する人はアプリでも Web でも答えられる。** アプリが入っている人は、LINE の URL がアプリで開き、そのまま答える(Universal Links / App Links)。入っていない人は今までどおり Web で答える。「アプリを入れないと答えられない」にはしない(30秒・登録なしが Tsudoro の約束のため)
- **iOS / Android アプリでの Tsudoro+ の購入は、ストアのアプリ内課金にする。** Stripe はアプリの中では使えない(デジタルの機能の解放はアプリ内課金が必須)。鍵(ライセンス)の仕組みはサーバー側で共通にする
- **置き場所は、このリポジトリの `mobile/` に作る。** API の形と Flutter のモデルを同じ PR で直せるようにするため
- 最初に出すのは「会を作る→答える→回答を見る→日にち・お店を決める→会計」までの最小版(MVP)。Play / Support と集金は2段目
- **iOS と Android は同時に出さなくてよい。** Mac が届くまでは Windows で Android を先に進め、先にできた方から出す

## 理由

### 1. ロジックをサーバーに残す
- 決め方(`lib/summary.ts`)・割り勘(`lib/split.ts`)・回答の検証(`lib/validation.ts`)・幹事の鍵の照合(`app/actions.ts`)は、すでにテストつきの純粋関数になっている。Dart に書き写すと、2か所を同じに保つ手間と食い違いが生まれる
- DB は service role キーで読み書きしていて、RLS のポリシーがない。アプリにキーを入れることはできないので、どのみちサーバーを通す必要がある
- 例外として、会計の画面のように打つたびに金額が変わるところは、`lib/split.ts` だけ Dart に移し、**同じテストの数字を Dart 側のテストにも書く**(計算の正しさはサーバーと同じ表で確かめる)

### 2. 参加者はアプリでも Web でも答えられる
- LINE で URL を開いた人を、必ずストアへ行かせると答える人が減る。だから Web で答える道は残す
- アプリが入っている人は、アプリで答えた方が早い(名前や駅を覚えておける)
- 幹事にとってのアプリの価値: 作った会をなくさない・回答が集まったら通知で知らせる・すぐ共有できる

### 3. アプリ内課金
- App Store / Google Play の決まりで、アプリの中で使う機能の解放(Play / Support)はアプリ内課金にしないと審査に通らない。Web(Stripe)で買った人のための「購入を復元」は、Web で買った鍵をアプリに入れる形なら使える(ただし iOS ではアプリの中から Web の購入ページへ誘導しない)
- ストアの手数料(15〜30%)がかかる。500円のままにするか、アプリだけ値段を変えるかは決めること(下の一覧)

## 全体の作り

```
Flutter アプリ (mobile/)
   │  HTTPS + JSON
   ▼
Next.js  app/api/v1/*  ← 新しく作る。中身は app/actions.ts と同じ lib/ の関数を呼ぶだけ
   │
   ▼
lib/store (Supabase / 仮DB)   lib/summary.ts   lib/shops.ts …
```

- `app/actions.ts` の中身を `lib/server/` などの関数に出し、Server Actions と REST API の両方から呼ぶ。**ロジックは1か所**
- 幹事の鍵は `Authorization: Bearer <adminToken>`、参加者の鍵はヘッダーかボディで渡す。照合は今と同じ `verifyToken`
- 返すエラーは今の `{ ok: false, error: "日本語の文" }` をそのまま使い、アプリはその文を出す(文章のきまりをサーバー側でそろえるため)
- 共有の文(`lib/share.ts`・`lib/reminder.ts`)もサーバーで作って返す。かっこを入れない・プライベートは敬語にしない、などのきまりを2か所で守らなくてよくなる
- API は版をつける(`/api/v1`)。ストアのアプリは古い版が長く残るので、項目を消すときは v2 を作る
- 呼びすぎ対策に、API にも回数の上限をつける(Vercel の WAF か、簡単な IP ごとの上限)

### 作る API(MVP)

| API | 中身(今の関数) |
|---|---|
| `POST /api/v1/parties` | `createParty` |
| `GET /api/v1/parties/:id` | `loadParty`(幹事の鍵があれば幹事用の集計も) |
| `POST /api/v1/parties/:id/decision` | `decide` |
| `PUT /api/v1/parties/:id/must` | `setMust` |
| `POST /api/v1/parties/:id/answers` | `saveAnswer`(参加者の鍵を返す。直すときはその鍵を渡す) |
| `GET /api/v1/parties/:id/answers/:answerId` | `getMyAnswer`(本人の鍵で読む) |
| `POST /api/v1/devices` | 通知の宛先(端末のトークン)を登録する |
| `POST /api/v1/parties/statuses` | `partyStatuses`(作った会の一覧の表示) |
| `GET /api/v1/shops` | `findShops` / `findSecondShops` |
| `GET /api/v1/stations?q=` | `searchStations` |
| `GET /api/v1/share-text` | `lib/share.ts` の文 |

2段目: `collections`(集金)、`pro`(購入の確認・復元)、`fun`(Play / Support のお題。お題を Dart に持たせるか API で配るかは、そのときに決める)。

## Flutter 側

### パッケージ(候補)
- 画面の移り変わり: `go_router`(Universal Links の `/p/:id` などをそのまま道に使える)
- 状態: `riverpod`
- 通信: `dio` か `http`。JSON のモデルは `freezed` + `json_serializable`
- 保存: 幹事の鍵は `flutter_secure_storage`、ほかは `shared_preferences`
- 共有: `share_plus`。LINE は `https://line.me/R/share?text=` を `url_launcher` で開く
- 外のリンク: `url_launcher` で**外のブラウザ**で開く。お店へは今と同じく `/go/...` を通す(紹介料と数えるため。アプリ内の WebView で開くと計測や報酬がずれやすい)
- 課金: `in_app_purchase`(または RevenueCat。サーバーでの確認を自前で書かずに済む)
- フォント: Poppins をアプリに同梱(`google_fonts` の通信に頼らない)

### フォルダ
```
mobile/
  lib/
    api/        API の呼び出しとモデル
    features/   party(作る・答える・見る・決める) / split / collect / fun / pro
    storage/    作った会の一覧など(Web の nomi:parties にあたる)
    ui/         色・文字・部品(黒 #000、金 #f5b83d)
  test/
```

### 守ること(CLAUDE.md のきまりをアプリにも)
- ダークだけ(ライトテーマを作らない)。広告の枠を出さない
- いちばん小さい画面(iPhone SE、幅 375pt)で崩れないか確かめる
- 画面の文は Web と同じきまり(句点・読点、仕事の会だけ敬語)。文は Web からそのまま持ってくる
- 提携リンクには「PR」をはっきり出す(`components/PrNote.tsx` と同じ)。一休・オズモールの名前は出さない
- ホットペッパーの写真には「画像提供:ホットペッパー グルメ」
- 一度外したもの(回答後の宣伝、前日のお知らせ、席の機能など)を戻さない

### Web からアプリへの引き継ぎ
- ブラウザに残っている幹事の鍵(`nomi:parties`)は、アプリから読めない
- 「アプリで開く」ボタンを Web の作った会の一覧に置き、幹事の URL(鍵つき)をアプリに渡す。1件ずつで十分(`lib/move.ts` のように全部をまとめて移す仕組みは、使われ方を見てから)

### 通知(アプリだけ。2026-11-22 ユーザーの判断で入れる)
- 幹事に「回答が届きました」「締め切りになりました」などを知らせる。参加者には「日にちとお店が決まりました」を知らせる
- 仕組みは Firebase Cloud Messaging(`firebase_messaging`。iOS は APNs 経由)。端末のトークンは会ごと・人ごとに DB に保存する(新しい表 `nomi_devices` とマイグレーション。`lib/store/` の Supabase 版と仮DB 版を両方そろえる)。名前や連絡先は持たない
- 送るのは、回答の保存・決定のときにサーバーから。通知が多すぎないよう、回答の通知はまとめる(例: 最初の1人と、その後は1時間に1回まで)
- 作らないもの: 「催促をアプリにまかせる」(やめた機能)と、前日のお知らせ(外した機能)。Web の通知のコード(`lib/webpush.ts` など)は使わない

## ストアに出すまでに要るもの

- **Mac**: iOS のビルドと提出には macOS が要る。Mac を買う前提で進める(2026-11-22 ユーザーの判断)。Xcode・CocoaPods・iOS シミュレーターを入れ、Windows では Android と Web の API 側を進める
- Apple Developer Program(年 99 ドル相当)と Google Play Console(初回 25 ドル)の登録。**登録・支払いはユーザーが行う**
- Universal Links / App Links: `public/.well-known/apple-app-site-association` と `public/.well-known/assetlinks.json` を置く(本番に出すのはユーザーの「出して」のあと)
- 年齢の区分: お酒を扱うので、iOS は 17+(または 18+)、Google Play も相当の区分にする
- 審査の注意: 中身が Web を包んだだけだと iOS で落ちやすい(ガイドライン 4.2)。画面は Flutter で作り、WebView で Web を表示しない
- プライバシー: ストアの「データの扱い」の申告と、`/privacy` にアプリの項を足す
- 特定商取引法の表記(`/legal`)にアプリ内課金の書き方を足す

## 進め方

1. **API を作る**(Next.js 側): `app/actions.ts` の中身を共通の関数に出し、`/api/v1` を作る。Vitest で API のテスト。Web の動きは変えない
2. **Flutter の土台**: `mobile/` を作り、色・フォント・`go_router`・API の呼び出しまで。仮DB の `npm run dev` につないで動かす
3. **MVP の画面**: ホーム(作った会の一覧)→ 会を作る → 答える → 回答の集計 → 日にちとお店を決める → 共有。会計(`split`)
4. **Universal Links / App Links と通知**: `/p/:id` と `/p/:id/admin` をアプリで開く。FCM の通知
5. **テスト配信**: 先に Android(Google Play の内部テスト)、Mac が届いたら iOS(TestFlight)
6. **2段目**: 集金、Play / Support、アプリ内課金と鍵の共通化
7. **公開**

## 決めること(ユーザー)

1. ~~Mac を使えるか~~ → 買う前提(2026-11-22)
2. アプリでの Tsudoro+ の値段(500円のままか、手数料ぶん上げるか)
3. ~~参加する人もアプリで答えられるようにするか~~ → 答えられる(Web でも答えられるまま。2026-11-22)
4. ~~アプリならではの通知を入れるか~~ → 入れる(2026-11-22)
5. ~~Android と iOS を同時に出すか~~ → 同時でなくてよい(2026-11-22)
