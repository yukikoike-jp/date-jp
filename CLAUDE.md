@AGENTS.md

# Tsudoro(飲み会の日程とお店がすぐ決まるアプリ)

URL を LINE に貼ると、みんなが30秒で行ける日と予算を答え、日にち・お店・会計まで決まる。登録なし・無料。
対象は プライベート(学生・友達・サークルを含む) / 仕事(画面の名前。コード上は worker) の2種類の会(最初の画面で選ぶ。2026-11-17 に、学生をプライベートにまとめた。コードの `"student"` は前に作った会を読むためだけに残してある。`normalizeAudience` でプライベートとして扱う。タバコの質問は、未成年の学生もいるため会社の会だけ)。

- 本番: https://www.tsudoro.com(正式なアドレスは www 付き。tsudoro.com は Vercel のドメイン設定で www へ移す)
- Vercel のプロジェクト名は `nomi`、保存の名前は `nomi:` / `date:` で始まる(前の名前 nomi → Date → Tsudoro の名残)
- 前のアドレス(〜.vercel.app)は残し、開くと引き継ぎの帯を出す(`components/MoveBanner.tsx`)

## 文章のきまり(画面に出る説明)
- 句点(。)と読点(、)は、必要なときだけ打つ。説明文は、1文だけでも、最後に「。」を付ける(2026-11-17 に変更。以前は1文だけなら付けない決まりだった)。ボタン・見出し・短い表示(「まだ回答なし」など)には付けない。読点はできるだけ減らす。法的な文書(プライバシーポリシー・特商法)と、読みものの記事(`lib/guides.ts`)は、ふつうに打つ

## 話し方
- 回答は日本語。結論から先に述べ、そのあとに理由を説明する

## 必ず守ること
- ファイルを勝手に消さない。消すときは、対象と理由を示して許可を得る
- 本番に出す(deploy)・本番の DB や DNS を変えるのは、ユーザーが「出して」などと言ったときだけ
- 広告(バナー広告・宣伝の枠)を出さない。ライトテーマを作らない
- メールを送らない。X(旧 Twitter)に投稿しない
- 秘密の鍵は画面や会話に出さない。受け渡しはクリップボード経由
- ログイン・購入・カードの入力は、ユーザーが行う。ドメインを買わない
- スマホ最優先。375px 幅で崩れないことを確かめる
- 一度ユーザーが決めて外したもの(LINE プレビューはアイコンだけ、回答後の「自分も会を作る」宣伝、前日のお知らせ、席の機能など)を、理由なしに戻さない

## お金の決まり
- 収入は予約サイトの紹介料(バリューコマース経由)と、投げ銭(OFUSE: https://ofuse.me/date、`SUPPORT_URL`)
- ホットペッパー: お店のリンクは `/go/...` を通す(押された数を数え、少し待ってから移る。アプリが勝手に開きにくくするため)。報酬の付くリンクは `AFFILIATE_URL_TEMPLATE`。アプリでの予約は報酬の対象外
- 一休・オズモール: お店の候補の1つとしてカードで並べる(`components/OtherSites.tsx`、`lib/otherSites.ts`)。広告の枠として出さない。`/out/[site]` を通して数える
  - 提携先の決まりで、ボタンや説明に社名・サイト名(一休・オズモール)を書かない
  - 会社の会と、予算が1人5,000円以上の友達の会では2軒目の後、ほかは最後に出す
  - バリューコマースのサイト審査が済むまでは出さない(`OTHER_SITES_ON=1` で出る)
- 提携リンクには、ステルスマーケティングにならないよう「PR」または「#アフィリエイト広告」をはっきり見える形で付ける(`components/PrNote.tsx`)
- 紹介料を出す前に、Vercel を有料プラン(Pro)にする(無料プランはお金を得るサイトに使えない)。手順は `docs/launch-checklist.md`
- **有料プレミアム(月額 500円のサブスク、Stripe)**: 軸は**エンターテインメント**。幹事がいる会を楽しくする「Play」(`/fun`。学生とプライベートは、ワードウルフ・NGワード・真実か挑戦・王様ゲーム・ルーレット・チーム分けの6つの遊び。**会社の会は別の道具**(話題ガチャ・ひとこと・幹事メモ・ルーレット・チーム分け。`lib/work.ts`。会社ではゲームを使いにくいため。話題は職場で聞きにくいことを入れない)。会社の会の Play の説明は「会話もあいさつも準備もスムーズに」(ゲームの「楽しく」とは言わない)。遊びのタブは3つずつ並べ、5つのときは下の2つを広げる。遊びはこの順に並べる(Play の説明は「幹事がいる会をもっと楽しく」だけで、遊びの名前を並べない)。応援(OFUSE)は、ホームのいちばん下の「説明の行」(Tsudoro について・幹事のガイド・プライバシーポリシー・応援)の4つ目に置く。`components/FunClient.tsx`、`lib/fun.ts`、`lib/games.ts`。席替えは、2026-11-17 に、より盛り上がる遊びに入れ替えた。お題は、だれでも楽しめる軽いものだけ)。傾斜で割るは、会社の会も含めて**無料**(2026-11-17 に有料から外した。有料はこの Play だけ)。ホームのタイル「Play」(右上は鍵のマークだけ)から入る。買う前は、見本の名前で動く「デモ版」で、鍵は決済の鍵がなくてもかけたまま(`hasFun`)。有料の印は鍵のマークだけ。集金の表づくり・PayPay のリンクをのせること(`PayLinkPanel`)は無料。Tsudoro はお金を預からない(リンクは PayPay のものだけ通す)
  - 月額の契約: Stripe Checkout(mode=subscription)。鍵は Stripe のお会計の id の署名で、**使うたびに Stripe で契約が続いているか(active / trialing)を確かめる**(10分は覚える。`lib/billing.ts` の `proActive`)。解約・確認は Stripe のカスタマーポータル(ダッシュボードで有効にしておく)。特定商取引法の表記(`/legal`)は月額の自動更新・解約の書き方
  - 持ち主が全部を試すときは、環境変数 `FUN_UNLOCK=1`(`.claude/launch.json` の `Date-fun-unlocked`)
  - 「催促をアプリにまかせる」(通知で催促する機能)は、ユーザーの判断でやめた(必要性が薄い。2026-11-17)。コード(`AutoRemindPanel.tsx`、`PerPersonReminders.tsx`、`lib/pushRemind.ts`、`lib/webpush.ts`、`app/api/cron/remind`、`public/sw.js`、DB の `nomi_push_subs`、環境変数 VAPID_*/CRON_SECRET)は残してあるが、画面からは使えない。使うなら、削除するかを先にユーザーに聞く
- 提携リンクには、ステルスマーケティングにならないよう「PR」または「#アフィリエイト広告」をはっきり見える形で付ける(`components/PrNote.tsx`)
- 紹介料を出す前に、Vercel を有料プラン(Pro)にする(無料プランはお金を得るサイトに使えない)。手順は `docs/launch-checklist.md`
- **有料プレミアム(月額 500円のサブスク、Stripe)**: **催促をアプリにまかせる(自動でお知らせ)**が中心。払っていない人に、幹事ではなく Tsudoro がブラウザの通知(Web Push)で知らせる(翌日・3日後・7日後)。気まずさの原因は「幹事が頼む側になること」なので、頼む側をアプリにする(`components/AutoRemindPanel.tsx`、`PushOptIn.tsx`、`lib/pushRemind.ts`、`app/api/cron/remind`)。集金の表づくり・PayPay のリンクをのせる・ひとりずつ文を作って送る、は無料。Tsudoro はお金を預からない(リンクは PayPay のものだけ通す)。ホームのタイルは「集金の催促を、アプリにまかせる」(右上は鍵のマークだけ。`/collect/new` で、合計と名前だけですぐ集金のページを作る)。集金のページは、すっきり保つ(「みんなに送る」「まだの人に催促」の欄は置かない。送るのは右上の「URLを送る」だけ)。有料の印は鍵のマークだけ
  - 月額の契約: Stripe Checkout(mode=subscription)。鍵は Stripe のお会計の id の署名で、**使うたびに Stripe で契約が続いているか(active / trialing)を確かめる**(10分は覚える。`lib/billing.ts` の `proActive`)。解約・確認は Stripe のカスタマーポータル(Stripe のダッシュボードで、ポータルを有効にしておく)。特定商取引法の表記(`/legal`)は月額の自動更新・解約の書き方になっている
  - 通知には、環境変数 `VAPID_PUBLIC_KEY` `VAPID_PRIVATE_KEY`(`npx web-push generate-vapid-keys`)と `CRON_SECRET`、マイグレーション `20261117000000_push_subs.sql` が要る。`vercel.json` の crons が1日1回 `/api/cron/remind` を呼ぶ。iPhone は、ホーム画面に追加したアプリからだけ通知を受け取れる
  - 席替え・ゲームの「もりあげ道具」と、「ひとりずつ催促」の有料化は、ユーザーの判断でやめた(買い切りから月額に変えたのも、ユーザーの判断。2026-11-17)
  - 催促は、決済の鍵がそろっていなくても鍵をかけたまま(`hasFun`)。買う前は「デモ版」(最初の1人ぶんの見本だけ)。ホームのタイルと各道具に「有料パック」「デモ版」の印を付ける
  - 持ち主が全部を試すときは、環境変数 `FUN_UNLOCK=1`(`.claude/launch.json` の `Date-fun-unlocked`)

## 技術
- Next.js 16(App Router、`cacheComponents`)+ TypeScript、Tailwind CSS、Supabase(Postgres)、Vercel
- お店のデータはホットペッパーグルメ Webサービス(`HOTPEPPER_API_KEY`。なければ見本のお店)。写真には「画像提供:ホットペッパー グルメ」を付ける
- 金額は整数(円)。割り勘・傾斜の計算は純粋関数(`lib/split.ts`)にしてテストを書く

## コマンド
- `npm run dev` 開発(画面の確認は `.claude/launch.json` の `Date`。仮DB で動き、一休・オズモールのカードも出る)
- `npm run build` 本番ビルド(型チェックを含む)
- `npm run lint` / `npm test`(Vitest)
- 本番に出す: `NODE_OPTIONS="--require <ascii-hostname.cjs>" npx vercel deploy --prod --yes`(Windows のホスト名に日本語があるため、Vercel CLI にこの回避策が必要)

## DB
- Supabase のプロジェクト「予定決め」(Kaerou と共用)。表は `nomi_` で始まる
- マイグレーションは `supabase/migrations/`。ダッシュボードの SQL Editor で適用する。新しい列を読むコードは、本番に適用してから出す
- DB には `lib/store/` の `Store` を通してアクセスする。Supabase 版(`supabase.ts`)と仮DB 版(`memory.ts`)を両方そろえて直す
- service role キーはサーバー側だけで使う。RLS は有効で、ポリシーなし

## 見た目
- 黒い地(#000)に金色(#f5b83d)。名前「Tsudoro」は Poppins の太字
- アイコンとはじめのアニメーションは、線で描いたグラス2つ+金のビール+金の火花で、同じものを使う(`components/Logo.tsx`、`public/tsudoro-icon.svg`、`lib/og.tsx`)。アイコンは `node scripts/make-icons.mjs` で書き出す

## 検索(SEO)
- Google Search Console にドメイン(tsudoro.com)で登録済み。確認用の DNS の TXT レコードは消さない
- サイトマップ `app/sitemap.ts`、幹事のガイド記事 `lib/guides.ts`(`/guide/[slug]`)
- 会のページ(`/p/`)は検索に出さない(noindex)

## 構成
- `lib/` 純粋なロジック。テストは同じ場所に `*.test.ts`
- `app/actions.ts` Server Actions。幹事の操作は、幹事の鍵をサーバー側で照合する
- `components/` 画面の部品
- `docs/launch-checklist.md` お金をもらう前の手順
