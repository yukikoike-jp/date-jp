import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../app_scope.dart';
import '../../ui/theme.dart';

/// 行きやすい駅を、名前で探して1つ選ぶ(全国。Web の StationPicker)
class StationPicker extends StatefulWidget {
  const StationPicker({super.key, required this.value, required this.onChanged});
  final Station? value;
  final ValueChanged<Station?> onChanged;

  @override
  State<StationPicker> createState() => _StationPickerState();
}

class _StationPickerState extends State<StationPicker> {
  final _q = TextEditingController();
  Timer? _wait;
  List<Station> _found = [];
  String? _error;

  @override
  void dispose() {
    _wait?.cancel();
    _q.dispose();
    super.dispose();
  }

  void _search(String q) {
    _wait?.cancel();
    if (q.trim().isEmpty) {
      setState(() => _found = []);
      return;
    }
    // 打つたびに呼ばないよう、手が止まってから探す
    _wait = Timer(const Duration(milliseconds: 300), () async {
      final api = AppScope.of(context).api;
      try {
        final found = await api.stations(q.trim());
        if (mounted && _q.text == q) {
          setState(() {
            _found = found;
            _error = null;
          });
        }
      } on ApiException catch (e) {
        if (mounted) setState(() => _error = e.message);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.value;
    if (v != null) {
      return InputChip(label: Text('${v.name}駅(${v.pref})'), onDeleted: () => widget.onChanged(null), deleteButtonTooltipMessage: '駅を外す');
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _q,
          decoration: const InputDecoration(hintText: '駅の名前(例: 仙台)', prefixIcon: Icon(Icons.search)),
          onChanged: _search,
        ),
        if (_error != null) Text(_error!, style: const TextStyle(color: Palette.danger, fontSize: 12)),
        for (final s in _found)
          ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: Text('${s.name}駅'),
            subtitle: Text(s.pref, style: const TextStyle(color: Palette.muted)),
            onTap: () {
              _q.clear();
              setState(() => _found = []);
              widget.onChanged(s);
            },
          ),
      ],
    );
  }
}
