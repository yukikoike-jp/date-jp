import 'package:material_ui/material_ui.dart';

import 'api/client.dart';
import 'storage/local.dart';

/// どの画面からも API と端末の保存を使えるようにする
class AppScope extends InheritedWidget {
  const AppScope({super.key, required this.api, required this.local, required super.child});
  final Api api;
  final Local local;

  static AppScope of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<AppScope>()!;

  @override
  bool updateShouldNotify(AppScope old) => api != old.api || local != old.local;
}
