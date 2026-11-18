"use server";

import { headers } from "next/headers";
import { AUDIENCES, isAudience, normalizeAudience } from "@/lib/audience";
import { billingEnabled, billingPortalUrl, createProCheckout, hasFun, licenseForEmail, proPrice } from "@/lib/billing";
import { canSetPayment, isConfirmed, parseCollection, type CollectionInput } from "@/lib/collection";
import { parsePushSub } from "@/lib/pushRemind";
import { cleanPayLink } from "@/lib/reminder";
import { pushReady } from "@/lib/webpush";
import { AREAS, isBudget, isGenreKey, isSecondGenreKey } from "@/lib/sendai";
import { findShop, searchSecondShops, searchShopsAlways, type Shop } from "@/lib/shops";
import { getStore } from "@/lib/store";
import type { Decision } from "@/lib/store/types";
import { findSponsor } from "@/lib/sponsors";
import { loadParty } from "@/lib/view";
import { summarize } from "@/lib/summary";
import { isStation, normalizeStationQuery, type Station } from "@/lib/stations";
import { generateGroupId, generateToken, hashToken, verifyToken } from "@/lib/tokens";
import { parseAnswer, parseParty, type AnswerInput } from "@/lib/validation";

type Fail = { ok: false; error: string };

/** via = "guest" なら、ほかの会で答えたことがある人が作った(招待から幹事が生まれた数を数える) */
export async function createParty(input: {
  title: string;
  audience: string;
  dates: string[];
  start: number;
  via?: string;
}): Promise<{ ok: true; id: string; adminToken: string } | Fail> {
  const parsed = parseParty(input);
  if (!parsed.ok) return parsed;
  const id = generateGroupId();
  const adminToken = generateToken();
  try {
    await getStore().createParty({ id, ...parsed.value, adminHash: hashToken(adminToken), via: input.via === "guest" ? "guest" : null });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "作れませんでした。時間をおいてもう一度お試しください" };
  }
  return { ok: true, id, adminToken };
}

export async function saveAnswer(
  partyId: string,
  mine: { answerId: string; token: string } | null,
  input: Record<string, unknown>,
): Promise<{ ok: true; answerId: string; token: string } | Fail> {
  const store = getStore();
  const party = await store.getParty(partyId);
  if (!party) return { ok: false, error: "飲み会が見つかりません" };
  const parsed = parseAnswer(input, party.dates, party.start);
  if (!parsed.ok) return parsed;

  let answerId = crypto.randomUUID();
  let token = generateToken();
  if (mine) {
    // 直すときは、本人のトークンを照らし合わせる
    const existing = (await store.listAnswers(partyId)).find((a) => a.id === mine.answerId);
    if (existing && verifyToken(mine.token, existing.tokenHash)) {
      answerId = existing.id;
      token = mine.token;
    }
  }
  const saved = await store.saveAnswer(partyId, { ...parsed.value, id: answerId, tokenHash: hashToken(token) });
  if (!saved) return { ok: false, error: "同じ名前の人がもういます。名字を足すなど少し変えてください" };
  return { ok: true, answerId, token };
}

/** 自分の回答を直すときに、前の回答を読む(予算はほかの人には見せないので、本人にだけ返す) */
export async function getMyAnswer(partyId: string, answerId: string, token: string): Promise<AnswerInput | null> {
  const answer = (await getStore().listAnswers(partyId)).find((a) => a.id === answerId);
  if (!answer || !verifyToken(token, answer.tokenHash)) return null;
  const { name, dates, arrival, stay, budget, areas, station, memo, avoids, drinks, smokes, likes, avoidNote } = answer;
  return {
    name,
    dates,
    arrival,
    stay,
    budget,
    areas,
    station: station ?? null,
    ...(memo ? { memo } : {}),
    avoids: avoids ?? [],
    drinks: drinks !== false,
    ...(smokes ? { smokes: true } : {}),
    likes: likes ?? [],
    ...(avoidNote ? { avoidNote } : {}),
  };
}

export async function decide(
  partyId: string,
  adminToken: string,
  choice: { date: string; shopId: string | null } | null,
): Promise<{ ok: true } | Fail> {
  const store = getStore();
  const party = await store.getParty(partyId);
  if (!party || !verifyToken(adminToken, party.adminHash)) return { ok: false, error: "幹事のURLから開いてください" };
  if (choice === null) {
    await store.setDecision(partyId, null);
    return { ok: true };
  }
  if (!party.dates.includes(choice.date)) return { ok: false, error: "候補の日から選んでください" };
  const summary = summarize(party.dates, await store.listAnswers(partyId), choice.date);
  if (summary.start === null) return { ok: false, error: "その日に行ける人がいません" };
  const shop = choice.shopId ? await findShop(choice.shopId) : null;
  await store.setDecision(partyId, {
    date: choice.date,
    start: summary.start,
    shopId: shop?.id ?? null,
    shopName: shop?.name ?? null,
  });
  return { ok: true };
}

/** 必ず来てほしい人を変える(幹事だけ)。答えた人の名前の中から選ぶ */
export async function setMust(partyId: string, adminToken: string, names: string[]): Promise<{ ok: true } | Fail> {
  const store = getStore();
  const party = await store.getParty(partyId);
  if (!party || !verifyToken(adminToken, party.adminHash)) return { ok: false, error: "幹事のURLから開いてください" };
  const answered = new Set((await store.listAnswers(partyId)).map((a) => a.name));
  const picked = [...new Set(Array.isArray(names) ? names : [])].filter((n) => typeof n === "string" && answered.has(n)).slice(0, 10);
  await store.setMust(partyId, picked);
  return { ok: true };
}

/** 「お店を探す」から使う。条件はすべて選択肢の中から受け取る */
export async function findShops(input: {
  /** 飲む場所の駅(全国) */
  station: unknown;
  genres: string[];
  budget: number | null;
  privateRoom: boolean;
  /** 飲み放題があるお店だけにする */
  freeDrink?: boolean;
  /** タバコが吸えるお店だけにする(社会人の画面だけで出す) */
  smoking?: boolean;
  audience: string;
}): Promise<{ shops: Shop[]; otherArea: boolean; relaxed: string | null }> {
  if (!isStation(input.station)) return { shops: [], otherArea: false, relaxed: null };
  const point = { lat: input.station.lat, lng: input.station.lng };
  const genres = [...new Set(Array.isArray(input.genres) ? input.genres : [])].filter(isGenreKey);
  const audience = isAudience(input.audience) ? normalizeAudience(input.audience) : "private";
  const budgets = AUDIENCES[audience].budgets;
  // 予算を「決めない」にしても、いちばん高い予算までのお店を先に探す
  const asked = isBudget(input.budget) ? input.budget : Math.max(...budgets);
  // 選んだ駅の近くで探し、合うお店がなければ条件を1つずつゆるめる(お店が必ず出るように)
  return searchShopsAlways(
    {
      area: "station",
      point,
      genres,
      budget: asked,
      privateRoom: input.privateRoom === true,
      freeDrink: input.freeDrink === true,
      ...(input.smoking === true ? { smoking: "only" as const } : {}),
      size: 2,
      audience,
    },
    10,
    budgets,
  );
}

/** 傾斜会計から集金のページを作る。金額はサーバーで計算し直す */
/** 集金のページは無料(2026-11-17 から。有料プレミアムにするのは Play だけ) */
export async function startCollection(input: CollectionInput): Promise<{ ok: true; id: string; adminToken: string } | Fail> {
  const parsed = parseCollection(input);
  if (!parsed.ok) return parsed;

  const id = generateGroupId();
  const adminToken = generateToken();
  try {
    await getStore().createCollection({ id, ...parsed.value, adminHash: hashToken(adminToken) });
  } catch (e) {
    console.error("[collection] 作れませんでした", e);
    return { ok: false, error: "集金のページを作れませんでした。少し待ってからもう一度お試しください" };
  }
  return { ok: true, id, adminToken };
}

/**
 * 払ったかどうかを切り替える。幹事(鍵が合う)だけが、受け取りとして記録できる
 */
export async function setCollectionPayment(
  collectionId: string,
  personId: number,
  paid: boolean,
  adminToken: string | null,
): Promise<{ ok: true } | Fail> {
  const store = getStore();
  const c = await store.getCollection(collectionId);
  if (!c) return { ok: false, error: "集金のページが見つかりません" };
  const person = c.people.find((p) => p.id === personId);
  if (!person || person.organizer) return { ok: false, error: "この人の支払いは変えられません" };
  const isHost = verifyToken(adminToken, c.adminHash);
  if (!canSetPayment(isHost)) return { ok: false, error: "受け取りの記録は幹事だけができます" };
  await store.setPayment(collectionId, personId, paid === true ? { by: "host" } : null);
  return { ok: true };
}

/**
 * 集金の設定。幹事(鍵が合う)だけが変えられる。
 * payLink = 幹事の PayPay のリンク(空で消す。参加する人の画面に「払う」ボタンが出る)。
 * autoRemind = 自動でお知らせ(有料プレミアム。オンにするには、契約中の端末の鍵 license が要る)
 */
export async function saveCollectionSettings(
  collectionId: string,
  adminToken: string | null,
  input: { payLink: string; autoRemind?: boolean },
  license: string | null,
): Promise<{ ok: true; payLink: string | null; autoRemindAt: number | null } | Fail> {
  const store = getStore();
  const c = await store.getCollection(collectionId);
  if (!c) return { ok: false, error: "集金のページが見つかりません" };
  if (!verifyToken(adminToken, c.adminHash)) return { ok: false, error: "設定を変えられるのは幹事だけです" };

  const raw = typeof input?.payLink === "string" ? input.payLink.trim() : "";
  const payLink = raw === "" ? null : cleanPayLink(raw);
  if (raw !== "" && payLink === null) return { ok: false, error: "PayPay のリンク(https://paypay.ne.jp/…)を入れてください" };

  let autoRemindAt: number | null = c.autoRemindAt ?? null;
  if (input?.autoRemind === true) {
    if (!(await hasFun(license))) return { ok: false, error: "自動でお知らせは Tsudoro Plus の機能です" };
    if (!pushReady()) return { ok: false, error: "通知の準備がまだできていません" };
    autoRemindAt = autoRemindAt ?? Date.now();
  } else if (input?.autoRemind === false) {
    autoRemindAt = null;
  }
  await store.setCollectionSettings(collectionId, { payLink, autoRemindAt });
  return { ok: true, payLink, autoRemindAt };
}

/**
 * 払うまで、この端末にお知らせを送ってよいと登録する。「自動でお知らせ」がオンの集金で、払っていない人だけ。
 * 名前の確認はしない(ログインがないため)。ほかの人の名前で登録しても、通知が届くのはその端末だけ
 */
export async function subscribePush(
  collectionId: string,
  personId: number,
  subscription: unknown,
): Promise<{ ok: true } | Fail> {
  const sub = parsePushSub(subscription);
  if (!sub) return { ok: false, error: "通知の登録に失敗しました" };
  const store = getStore();
  const c = await store.getCollection(collectionId);
  if (!c || c.autoRemindAt === undefined) return { ok: false, error: "この集金は自動でお知らせを使っていません" };
  const person = c.people.find((p) => p.id === personId);
  if (!person || person.organizer || isConfirmed(c.payments[person.id])) return { ok: false, error: "この人にはお知らせは要りません" };
  const subs = await store.listPushSubs(collectionId);
  if (subs.length >= 200) return { ok: false, error: "登録できる数をこえました" };
  await store.addPushSub({ collectionId, personId, ...sub });
  return { ok: true };
}

/** 「集金のチェック」の一覧に出す、集金ごとの進み具合。払ったかどうかの数だけを返す */
export async function collectionProgress(
  ids: string[],
): Promise<{ id: string; payers: number; paid: number; unpaidYen: number }[]> {
  const list = (Array.isArray(ids) ? ids : []).filter((id) => typeof id === "string" && /^[a-z0-9]{6,20}$/.test(id)).slice(0, 30);
  const store = getStore();
  const rows = await Promise.all(
    list.map(async (id) => {
      try {
        const c = await store.getCollection(id);
        if (!c) return null;
        const payers = c.people.filter((p) => !p.organizer);
        const unpaid = payers.filter((p) => !isConfirmed(c.payments[p.id]));
        return { id, payers: payers.length, paid: payers.length - unpaid.length, unpaidYen: unpaid.reduce((s, p) => s + p.amount, 0) };
      } catch {
        return null;
      }
    }),
  );
  return rows.filter((r): r is NonNullable<typeof r> => r !== null);
}

/**
 * 二次会のお店。一次会のお店が決まっていればその近く、なければ一番人気の場所の近くで探す。
 * 人数は二次会に残れる人(いなければ行く人全員)
 */
export async function findSecondShops(
  partyId: string,
  genre: string | null,
): Promise<{ shops: Shop[]; size: number; near: string }> {
  const view = await loadParty(partyId);
  if (!view?.party.decision) return { shops: [], size: 0, near: "" };
  const { party, summary } = view;
  const decision = party.decision!;
  const first = decision.shopId ? await findShop(decision.shopId) : null;
  const area = AREAS.find((a) => a.key === summary.area) ?? AREAS[0];
  const base =
    first?.lat != null && first.lng != null
      ? { lat: first.lat, lng: first.lng }
      : summary.meeting ?? { lat: area.lat, lng: area.lng };
  const size = summary.secondParty.length || summary.attendees.length;
  const shops = await searchSecondShops({
    ...base,
    size,
    genre: isSecondGenreKey(genre) ? genre : null,
    exclude: decision.shopId,
    area: area.key,
  });
  return {
    shops,
    size,
    near: first?.lat != null ? (decision.shopName ?? first.name) : summary.meeting ? `${summary.meeting.name}駅` : area.label,
  };
}

/**
 * 駅名から駅を探す(全国)。HeartRails Express の無料の駅データを使う。
 * 同じ駅の路線ちがいは1つにまとめ、名前と都道府県と場所だけを返す
 */
export async function searchStations(query: string): Promise<Station[]> {
  const q = typeof query === "string" ? normalizeStationQuery(query) : "";
  if (!q) return [];
  try {
    const res = await fetch(`https://express.heartrails.com/api/json?method=getStations&name=${encodeURIComponent(q)}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { response?: { station?: { name: string; prefecture: string; x: number; y: number }[] } };
    const out: Station[] = [];
    for (const s of body.response?.station ?? []) {
      if (out.some((o) => o.name === s.name && o.pref === s.prefecture)) continue;
      out.push({ name: s.name, pref: s.prefecture, lat: Number(s.y), lng: Number(s.x) });
    }
    return out.slice(0, 8);
  } catch (e) {
    console.error("[stations] 駅を探せませんでした", e);
    return [];
  }
}

/** 広告が画面に出たことを数える。lib/sponsors.ts にある広告だけを数える */
export async function logAdView(sponsorId: string): Promise<void> {
  const sponsor = typeof sponsorId === "string" ? findSponsor(sponsorId) : null;
  if (!sponsor) return;
  await getStore()
    .logAdEvent(sponsor.id, "view")
    .catch((e) => console.error("[ad] 数えられませんでした", e));
}

/** going = 決まった日に行く人の数(決まっていなければ 0)。audience = 学生・プライベート・会社のどれの会か */
export type PartyStatus = { decision: Decision | null; answered: number; going: number; audience: string };

/**
 * ホームの「あなたの会」を、決まった会と調整中の会に分けるのに使う。
 * 参加者の URL でも見られる内容(決まった日とお店、答えた人数)だけを返す。なくなった会は返さない
 */
export async function partyStatuses(ids: string[]): Promise<Record<string, PartyStatus>> {
  const list = (Array.isArray(ids) ? ids : []).filter((id): id is string => typeof id === "string").slice(0, 30);
  const store = getStore();
  const rows = await Promise.all(
    list.map(async (id) => {
      const party = await store.getParty(id);
      if (!party) return null;
      const answers = await store.listAnswers(id);
      const going = party.decision ? summarize(party.dates, answers, party.decision.date).attendees.length : 0;
      return [id, { decision: party.decision, answered: answers.length, going, audience: party.audience }] as const;
    }),
  );
  return Object.fromEntries(rows.filter((r) => r !== null));
}

/**
 * 会計に、決まった会の行く人を読み込む。幹事の鍵(この端末に残っているもの)で確かめる。
 * 名前と、お酒を飲まないかだけを返す
 */
export async function partyAttendees(
  partyId: string,
  adminToken: string,
): Promise<{ title: string; date: string; attendees: { name: string; soft: boolean }[] } | null> {
  const store = getStore();
  const party = typeof partyId === "string" ? await store.getParty(partyId) : null;
  if (!party?.decision || !verifyToken(adminToken, party.adminHash)) return null;
  const summary = summarize(party.dates, await store.listAnswers(party.id), party.decision.date);
  return { title: party.title, date: party.decision.date, attendees: summary.attendees.map((a) => ({ name: a.name, soft: a.soft })) };
}

/** 有料プレミアムの機能(催促をアプリにまかせる)が使えるか。unlocked = false なら見本だけのデモ版。purchasable = いま買えるか(支払いの準備ができているか) */
export async function funStatus(license: string | null): Promise<{ purchasable: boolean; unlocked: boolean; price: number }> {
  return { purchasable: billingEnabled(), unlocked: await hasFun(license), price: proPrice() };
}

/** 月額のお会計のページを開く。back = 買ったあとに戻るページ(このサイトの中だけ) */
export async function buyPro(back: string): Promise<{ ok: true; url: string } | Fail> {
  if (!billingEnabled()) return { ok: false, error: "いまは支払いを受け付けていません" };
  const path = typeof back === "string" && /^\/[A-Za-z0-9/_?=&.-]*$/.test(back) && !back.startsWith("//") ? back : "/split";
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  try {
    return { ok: true, url: await createProCheckout(`${proto}://${host}`, path) };
  } catch (e) {
    console.error("[billing] お会計のページを作れませんでした", e);
    return { ok: false, error: "お会計のページを開けませんでした。少し待ってからもう一度お試しください" };
  }
}

/** 別の端末で使うとき。買ったときのメールアドレスから、支払いを確かめて鍵を返す */
export async function restorePro(email: string): Promise<{ ok: true; license: string } | Fail> {
  if (!billingEnabled()) return { ok: false, error: "いまは支払いを受け付けていません" };
  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 200) return { ok: false, error: "メールアドレスを確かめてください" };
  try {
    const license = await licenseForEmail(e);
    return license ? { ok: true, license } : { ok: false, error: "このメールアドレスでの購入が見つかりません" };
  } catch (err) {
    console.error("[billing] 購入を確かめられませんでした", err);
    return { ok: false, error: "確かめられませんでした。少し待ってからもう一度お試しください" };
  }
}

/** 契約の確認・解約のページ(Stripe のカスタマーポータル)を開く。契約中の端末の鍵 license が要る */
export async function openBillingPortal(license: string | null, back: string): Promise<{ ok: true; url: string } | Fail> {
  if (!billingEnabled()) return { ok: false, error: "いまは支払いを受け付けていません" };
  const path = typeof back === "string" && /^\/[A-Za-z0-9/_?=&.-]*$/.test(back) && !back.startsWith("//") ? back : "/";
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  try {
    const url = await billingPortalUrl(license, `${proto}://${host}${path}`);
    return url ? { ok: true, url } : { ok: false, error: "契約が見つかりません" };
  } catch (e) {
    console.error("[billing] 契約のページを開けませんでした", e);
    return { ok: false, error: "契約のページを開けませんでした。少し待ってからもう一度お試しください" };
  }
}

/**
 * どこから来たかを数える(SNS のリンクの ?s=ig など)。広告の記録の表に「src:名前」で残す(誰かは残さない)。
 * 名前は英数字12文字まで。数えられなくても、画面には何も出さない
 */
export async function recordSource(source: string): Promise<void> {
  if (typeof source !== "string" || !/^[a-z0-9_-]{1,12}$/.test(source)) return;
  try {
    await getStore().logAdEvent(`src:${source}`, "view");
  } catch (e) {
    console.error("[source] 数えられませんでした", e);
  }
}
