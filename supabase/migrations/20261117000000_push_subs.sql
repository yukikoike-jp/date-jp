-- 集金の「自動でお知らせ」(有料パック)。払うまで通知を受け取る端末(ブラウザの通知の宛先)。
-- 名前や連絡先は持たない。ブラウザから直接は読み書きさせない(サーバーが service role で読む)。
-- 集金ごとの設定(PayPay のリンク・自動でお知らせをオンにした時刻)は、nomi_collections.data(jsonb)の中に入れるので、列は足さない

create table nomi_push_subs (
  collection_id text not null references nomi_collections (id) on delete cascade,
  person_id integer not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  sent_count integer not null default 0,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (collection_id, endpoint)
);

alter table nomi_push_subs enable row level security;
