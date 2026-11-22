# Flutter アプリの実装方針(Issue #1 ネイティブアプリにする)

担当: Oe-Shota / 作成: 2026-11-22

## 結論

- **Flutter アプリは「幹事の道具箱」として作り、データと決めるロジックは今の Next.js サーバーに残す。** アプリは新しく作る REST API(`/api/v1/...`)だけを呼ぶ。Supabase には直接つながない
- **参加する人はアプリでも Web でも答えられる。** アプリが入っている人は、LINE の URL がアプリで開き、そのまま答える(Universal Links / App Links)。入っていない人は今までどおり Web で答える。「アプリを入れないと答えられない」にはしない(30秒・登録なしが Tsudoro の約束のため)
- **アプリでの Tsudoro+ の買い方は、iOS と Android で分ける(案)。** iOS は Web(今の Stripe)へのリンク。Apple は日本で 2025年12月から認めていて、今の Stripe と鍵(ライセンス)の仕組みをそのまま使える。Android は Google Play の課金だけ。Google は日本で 2026年9月30日から、Web へのリンクを出すなら Google Play の課金も並べて選ばせる決まりにしたので、どのみち Google Play の課金を作ることになる
- **置き場所は、このリポジトリの `mobile/` に作る。** API の形と Flutter のモデルを同じ PR で直せるようにするため
- 最初に出すのは「会を作る→答える→回答を見る→日にち・お店を決める→会計」までの最小版(MVP)。Play / Support と集金は2段目
- **iOS と Android は同時に出さなくてよい。** Mac が届くまでは Windows で Android を先に進め、先にできた方から出す

## 理由

### 1. ロジックをサーバーに残す
- 決め方(`lib/summary.ts`)・割り勘(`lib/split.ts`)・回答の検証(`lib/validation.ts`)・幹事の鍵の照合(`app/actions.ts`)は、すでにテストつきの純粋関数になっている。Dart に書き写すと、2か所を同じに保つ手間と食い違いが生まれる
- DB は service role キーで読み書きしていて、RLS のポリシーがない。アプリにキーを入れることはできないので、どのみちサーバーを通す必要がある
- 例外として、会計の画面のように打つたびに金額が変わるところは、`lib/split.ts` だけ Dart に移す。**入力と答えの表を JSON ファイル1つ(例: `lib/split.cases.json`)にまとめ、Vitest と Dart のテストの両方がそのファイルを読む。** 数字を2か所に手で書くと、片方だけ直したときに気づけず、Web とアプリで1人あたりの金額がずれるため

### 2. 参加者はアプリでも Web でも答えられる
- LINE で URL を開いた人を、必ずストアへ行かせると答える人が減る。だから Web で答える道は残す
- アプリが入っている人は、アプリで答えた方が早い(名前や駅を覚えておける)
- 幹事にとってのアプリの価値: 作った会をなくさない・回答が集まったら通知で知らせる・すぐ共有できる

### 3. 買い方(2026-11-22 に調べた内容)

**iOS(Apple)**
- 2025年12月から、日本の App Store のアプリは、Web の購入ページへリンクしてよい。Web で買った分の手数料は 15%(小さな開発者向けの制度に入れば 10%)。ストアのアプリ内課金は 10% か 21%(Apple の決済を使うと、さらに 5% かかるという説明もある)
- 13歳未満の人には、Web へのリンクを出せない。Web で買った分は Apple が返金できない
- 2026年に日本の条件が変わったという情報は見つからなかった(Apple の公式の発表は 2025年12月のまま)。Apple 以外の解説によると、手数料がかかるのはリンクを押してから7日以内の購入。また、開発者は 2026年3月17日までに新しい規約に同意する必要があった
- → **Web へのリンクにする。** 今の `buyPro`・`/pro/done`・鍵の仕組みをそのまま使える。アプリは購入のページを外のブラウザで開き、買い終わったら鍵をアプリに渡す(Universal Links で `/pro/done` をアプリで開く)

**Android(Google Play)**
- 日本では 2026年9月30日から「billing choice」という制度になった。前の「external payments」の制度は、新しい申し込みを 2026年9月30日で締め切り、2027年3月31日で終わる
- billing choice では、**Web へのリンクだけを出すことはできない。** Google Play の課金と並べて、使う人に選ばせる。選ぶ画面の前に、一度だけ説明の画面を出す。Web で売れた分は24時間以内に API で Google に知らせる。Play Billing Library 9.1 以上が要る。返金の窓口も自分で持つ
- Web へのリンクの手数料: 20%(年の売上の最初の100万ドルまでは 10%)。リンクを押してから24時間以内の購入にかかる
- billing choice に入るかは自由。入らなければ、Google Play の課金だけを使う(この場合の手数料は Google の別のページにあり、まだ読んでいない)
- → **Google Play の課金だけにする(billing choice には入らない)。** Web へのリンクを出しても、Google Play の課金・選ぶ画面・売上を知らせる API を作ることになり、手数料もほとんど下がらないため
- Android は `in_app_purchase` で買い、サーバーで Google にレシートを確かめてから、Web と同じ形の鍵を出す。`lib/license.ts` の鍵は、今は Stripe のお会計の id(`cs_...`)だけを受け付けるので、Google の購入でも使える形に広げる

- 値段を500円のままにするかは決めること(下の一覧)
- 出どころ: [Apple の発表(2025年12月)](https://www.apple.com/newsroom/2025/12/apple-announces-changes-to-ios-in-japan/)、[Google: billing choice への申し込み](https://support.google.com/googleplay/android-developer/answer/17161464)、[Google: billing choice の説明](https://developer.android.com/google/play/billing/billingchoice)、[Google: external payments への申し込み](https://support.google.com/googleplay/android-developer/answer/16787536)、[Stora の解説(7日以内の購入の件)](https://stora.sh/blog/2026-05-21-distribute-ios-app-japan-alternative-marketplaces-notarization-guide)

## 全体の作り

```
Flutter アプリ (mobile/)
   │  HTTPS + JSON
   ▼
Next.js  app/api/v1/*  ← 新しく作る。中身は app/actions.ts の関数を呼ぶだけ
   │
   ▼
lib/store (Supabase / 仮DB)   lib/summary.ts   lib/shops.ts …
```

### API の技術選定(2026-11-22)

| 決めたこと | 選んだもの | 選ばなかったもの |
|---|---|---|
| どこで動かすか | **今の Next.js の Route Handler(`app/api/v1/**/route.ts`)** | 別のサーバー(Hono・Express など): 置き場所と本番に出す手間が2つになる。Supabase に直接つなぐ(RLS のポリシーを書く): 鍵の照合と予算を隠す処理を、DB 側にもう一度書くことになる |
| 中身 | **`app/actions.ts` の関数をそのまま呼ぶ** | 中身を `lib/server/` に移す: 移す量が多いわりに得るものがない。Server Actions はもともと外から呼べる入口なので、入力の確かめと鍵の照合は、すでに関数の中にある |
| 入力の確かめ | **今の `lib/validation.ts` など(手で書いたもの)** | zod: 確かめ方が2通りになる |
| 形の取り決め | **JSON。`docs/api.md` に書き、Vitest のテストで形を守る。** Dart のモデルは `freezed` で手で書く | OpenAPI からの自動生成: 道具が増える。API が20本をこえる、または使う側が3つ目になったら考える |
| 鍵の渡し方 | **幹事の鍵は `Authorization: Bearer`。参加者の鍵は、直すときはボディ、読むときは `X-Answer-Token` ヘッダー** | Cookie: アプリでは扱いにくい |
| 失敗のとき | **`{ ok: false, error: "日本語の文" }`。見つからないときは 404、それ以外は 400** | 失敗の種類ごとのコード: 今は画面に文を出すだけなので要らない |
| 呼びすぎ対策 | **Vercel の Firewall(WAF)のレート制限。** 本番の設定なので、ユーザーの「出して」のあとに入れる | サーバーのメモリで数える: Vercel では効かない |

- **ロジックは1か所**(`app/actions.ts` と `lib/`)。API は、受け取った JSON を関数に渡し、結果を JSON で返すだけ
- 幹事の鍵は `Authorization: Bearer <adminToken>`、参加者の鍵はヘッダーかボディで渡す。照合は今と同じ `verifyToken`
- 返すエラーは今の `{ ok: false, error: "日本語の文" }` をそのまま使い、アプリはその文を出す(文章のきまりをサーバー側でそろえるため)
- 共有の文(`lib/share.ts`・`lib/reminder.ts`)もサーバーで作って返す。かっこを入れない・プライベートは敬語にしない、などのきまりを2か所で守らなくてよくなる
- API は版をつける(`/api/v1`)。ストアのアプリは古い版が長く残るので、項目を消すときは v2 を作る
- 呼びすぎ対策に、API にも回数の上限をつける。**Vercel の WAF(Firewall のレート制限)でかける。** Vercel では呼ばれるたびに別のサーバーで動くことがあるので、サーバーのメモリで回数を数えても上限は効かない

### 作る API(MVP)

| API | 中身(今の関数) |
|---|---|
| `POST /api/v1/parties` | `createParty` |
| `GET /api/v1/parties/:id` | `loadParty`。**戻り値の `adminHash`(幹事の鍵のハッシュ)は必ず除いて返す**(今の Web のページも、受け取ったあとで除いている)。幹事と参加者で返す中身は同じ |
| `POST /api/v1/parties/:id/decision` | `decide` |
| `PUT /api/v1/parties/:id/must` | `setMust` |
| `POST /api/v1/parties/:id/answers` | `saveAnswer`(参加者の鍵を返す。直すときはその鍵を渡す) |
| `GET /api/v1/parties/:id/answers/:answerId` | `getMyAnswer`(本人の鍵で読む) |
| `POST /api/v1/devices` | 通知の宛先(端末のトークン)を登録する。**幹事の通知は幹事の鍵、参加者の通知は本人の回答の鍵を `verifyToken` で確かめてから登録する**(会の id は参加者全員の URL に入っているので、id だけでは登録させない) |
| `POST /api/v1/parties/statuses` | `partyStatuses`(作った会の一覧の表示) |
| `GET /api/v1/parties/:id/attendees` | `partyAttendees`(会計に行く人を読み込む。幹事だけ) |
| `POST /api/v1/shops/search` | `findShops`(条件が多いので POST。二次会も `second` で探せる) |
| `GET /api/v1/stations?q=` | `searchStations` |

- 共有の文(`lib/share.ts`)は、別の API にせず `GET /api/v1/parties/:id` の `share` に入れて返す
- `POST /api/v1/devices` 以外は作った(2026-11-22)。形の詳しい取り決めは `docs/api.md`

2段目: `collections`(集金)、`pro`(購入。Web へのリンクにするなら、今の `buyPro` を呼ぶだけ)、`fun`(Play / Support のお題。お題を Dart に持たせるか API で配るかは、そのときに決める)。

## Flutter 側

### パッケージ(候補)
- 画面の移り変わり: `go_router`(Universal Links の `/p/:id` などをそのまま道に使える)
- 状態: `riverpod`
- 通信: `dio` か `http`。JSON のモデルは `freezed` + `json_serializable`
- 保存: 幹事の鍵は `flutter_secure_storage`、ほかは `shared_preferences`
- 共有: `share_plus`。LINE は `https://line.me/R/share?text=` を `url_launcher` で開く
- 外のリンク: `url_launcher` で**外のブラウザ**で開く。お店へは今と同じく `/go/...` を通す(紹介料と数えるため。アプリ内の WebView で開くと計測や報酬がずれやすい)
- 課金: iOS は Web へのリンクなので、追加のパッケージは要らない(`url_launcher` で開く)。Android は `in_app_purchase`(Google Play の課金)
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
- 幹事に「回答が届きました」を知らせる。参加者には「日にちとお店が決まりました」を知らせる
- 仕組みは Firebase Cloud Messaging(`firebase_messaging`。iOS は APNs 経由)。端末のトークンは会ごと・人ごとに DB に保存する(新しい表 `nomi_devices` とマイグレーション。`lib/store/` の Supabase 版と仮DB 版を両方そろえる)。名前や連絡先は持たない
- 登録するときは鍵を確かめる(上の API の表の `POST /api/v1/devices`)
- 送るのは、回答の保存・決定のときにサーバーから。通知が多すぎないよう、回答の通知はまとめる(例: 最初の1人と、その後は1時間に1回まで)。**最後に送った時刻は `nomi_devices` の列(例: `last_sent_at`)に持つ。** サーバーのメモリに置くと、別のサーバーから見えず、上限が効かない
- 「締め切りになりました」は、最初の版では作らない。締め切りは誰も何もしなくても来るので、回答の保存や決定をきっかけにしては送れない。入れるときは、1日1回の cron(`vercel.json` の crons)で送る
- 作らないもの: 「催促をアプリにまかせる」(やめた機能)と、前日のお知らせ(外した機能)。Web の通知のコード(`lib/webpush.ts` など)は使わない

## ストアに出すまでに要るもの

- **Mac**: iOS のビルドと提出には macOS が要る。Mac を買う前提で進める(2026-11-22 ユーザーの判断)。Xcode・CocoaPods・iOS シミュレーターを入れ、Windows では Android と Web の API 側を進める
- Apple Developer Program(年 99 ドル相当)と Google Play Console(初回 25 ドル)の登録。**登録・支払いはユーザーが行う**
- Universal Links / App Links: `public/.well-known/apple-app-site-association` と `public/.well-known/assetlinks.json` を置く(本番に出すのはユーザーの「出して」のあと)
- 年齢の区分: お酒を扱うので、iOS は 17+(または 18+)、Google Play も相当の区分にする
- 審査の注意: 中身が Web を包んだだけだと iOS で落ちやすい(ガイドライン 4.2)。画面は Flutter で作り、WebView で Web を表示しない
- プライバシー: ストアの「データの扱い」の申告と、`/privacy` にアプリの項を足す
- 特定商取引法の表記(`/legal`): iOS(Web で買う)は今の書き方のまま。Android の Google Play での購入の書き方(支払い方法・返金は Google の決まりによる、など)を足す

## 進め方

1. **API を作る**(Next.js 側): `/api/v1` を作り、`app/actions.ts` の関数を呼ぶ。Vitest で API のテスト。Web の動きは変えない → 済み(2026-11-22。通知の登録だけ残り)
2. **Flutter の土台**: `mobile/` を作り、色・フォント・`go_router`・API の呼び出しまで。仮DB の `npm run dev` につないで動かす
3. **MVP の画面**: ホーム(作った会の一覧)→ 会を作る → 答える → 回答の集計 → 日にちとお店を決める → 共有。会計(`split`)
4. **Universal Links / App Links と通知**: `/p/:id` と `/p/:id/admin` をアプリで開く。FCM の通知
5. **テスト配信**: 先に Android(Google Play の内部テスト)、Mac が届いたら iOS(TestFlight)
6. **2段目**: 集金、Play / Support、購入(iOS は Web へのリンク、Android は Google Play の課金)
7. **公開**

## 決めること(ユーザー)

1. ~~Mac を使えるか~~ → 買う前提(2026-11-22)
2. アプリでの Tsudoro+ の買い方(案: iOS は Web へのリンク、Android は Google Play の課金)と値段(500円のままか、手数料ぶん上げるか)
3. ~~参加する人もアプリで答えられるようにするか~~ → 答えられる(Web でも答えられるまま。2026-11-22)
4. ~~アプリならではの通知を入れるか~~ → 入れる(2026-11-22)
5. ~~Android と iOS を同時に出すか~~ → 同時でなくてよい(2026-11-22)
