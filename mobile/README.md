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

## 道(Web と同じ)
- `/` ホーム
- `/p/:id` 会
- `/p/:id/admin?token=...` 幹事
