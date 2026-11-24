# Tsudoro アプリ(Flutter)

方針は `../docs/flutter-plan.md`、呼ぶ API は `../docs/api.md`。

## 動かす

```sh
fvm install            # .fvmrc の Flutter 3.50.1 を入れる
fvm flutter pub get
fvm flutter test
fvm flutter analyze
```

API は、リポジトリの上の階層で `npm run dev`(仮DB)を動かしてからつなぐ。

```sh
fvm flutter run                                                   # Android エミュレーター(http://10.0.2.2:3000/api/v1)
fvm flutter run --dart-define=API_BASE=http://localhost:3000/api/v1   # iOS シミュレーター
```

## 実機(Android)で動かす

空きの少ないスマホでも入るよう、軽いプロファイル版を arm64 だけで作る(debug 版は 200MB ある)。プロファイル版も開発用なので http の `npm run dev` につなげる(`android/app/src/profile/AndroidManifest.xml`)。

```sh
adb reverse tcp:3000 tcp:3000
fvm flutter build apk --profile --target-platform android-arm64 --split-per-abi --dart-define=API_BASE=http://localhost:3000/api/v1
adb -s <端末> install -r build/app/outputs/flutter-apk/app-arm64-v8a-profile.apk
adb -s <端末> shell am start -a android.intent.action.VIEW -d "'https://www.tsudoro.com/p/<id>/admin?token=<鍵>'" com.tsudoro.tsudoro
```

- 撮影用の会(6人が回答)は、`STORE=memory npm run dev` に、会と回答を `POST /api/v1/parties` と `/answers` で作る
- エミュレーターと実機を両方つないでいるときは、`adb -s` で相手を決める
- Git Bash では `/sdcard` などがパソコンのパスに書き換わる。`MSYS_NO_PATHCONV=1` を付ける
- `adb shell input text` は日本語を打てない。駅の名前などは、スマホのキーボード(かな)をフリックして打ち、変換の候補を押す
- アプリを止めて起動し直すと、Android は最後に開いたリンクで起動することがある(ホームでなく会の画面が出る)
- 画面の下に、スマホのコピー履歴の表示が出ることがある。押す位置が重なると共有の画面が開く。中身が写った画像は残さない
- 見本のお店しかない開発環境では、二次会のお店は出ず、♡ も出ない(見本には付けない)

## 道(Web と同じ)
- `/` ホーム
- `/p/:id` 会
- `/p/:id/answer` 答える
- `/p/:id/admin?token=...` 幹事
- `/new` 会を作る、`/shops` お店探し、`/split?from=<id>` 会計
