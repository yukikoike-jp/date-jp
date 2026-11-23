import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import 'api/client.dart';
import 'app_scope.dart';
import 'features/answer/answer_screen.dart';
import 'features/create/create_screen.dart';
import 'features/home/home_screen.dart';
import 'features/party/party_screen.dart';
import 'features/split/split_screen.dart';
import 'storage/local.dart';
import 'ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(TsudoroApp(api: Api(), local: await Local.open()));
}

// 道は Web と同じ(/new、/p/:id、/p/:id/admin?token=)。届いた URL(App Links)をそのまま受けるため。
// どの画面もホームの下に置く。URL から開いても、戻るとホームに行く
GoRouter buildRouter(Local local) => GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (_, _) => const HomeScreen(),
      routes: [
        GoRoute(path: 'new', builder: (_, _) => const CreateScreen()),
        // ?from=<会の id> なら、その会の行く人を読み込む
        GoRoute(
          path: 'split',
          builder: (_, s) => SplitScreen(fromPartyId: s.uri.queryParameters['from']),
        ),
        GoRoute(
          path: 'p/:id',
          builder: (_, s) => PartyScreen(id: s.pathParameters['id']!),
          // 答える画面の URL から直接来ても、答えたあと・戻ったあとは会のページ
          routes: [
            GoRoute(
              path: 'answer',
              builder: (_, s) => AnswerScreen(id: s.pathParameters['id']!),
            ),
          ],
        ),
        GoRoute(
          path: 'p/:id/admin',
          // 幹事の URL から来たら鍵はその中。作った会の一覧から来たら端末に残した鍵
          builder: (_, s) {
            final id = s.pathParameters['id']!;
            return PartyScreen(id: id, adminToken: s.uri.queryParameters['token'] ?? local.adminToken(id));
          },
        ),
      ],
    ),
  ],
);

class TsudoroApp extends StatelessWidget {
  TsudoroApp({super.key, required this.api, required this.local}) : router = buildRouter(local);
  final Api api;
  final Local local;
  final GoRouter router;

  @override
  Widget build(BuildContext context) {
    return AppScope(
      api: api,
      local: local,
      child: MaterialApp.router(
        title: 'Tsudoro',
        theme: darkTheme,
        routerConfig: router,
        debugShowCheckedModeBanner: false,
        // 端末の言語によらず日本語(漢字を日本の字の形で出し、部品の文言も日本語にする)
        locale: const Locale('ja', 'JP'),
        supportedLocales: const [Locale('ja', 'JP')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
      ),
    );
  }
}
