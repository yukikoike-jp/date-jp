import { describe, expect, it } from "vitest";
import { isDue, notificationText, parsePushSub, runReminders, type Sender } from "./pushRemind";
import type { Collection, PushSub, Store } from "./store/types";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 20, 0, 0);

describe("isDue", () => {
  it("オンにした日から数えて、1日後・3日後・7日後に1回ずつ", () => {
    expect(isDue(T0, T0 + 0.5 * DAY, 0, null)).toBe(false);
    expect(isDue(T0, T0 + 1 * DAY, 0, null)).toBe(true);
    // 1回送ったあとは、3日後まで送らない
    expect(isDue(T0, T0 + 2 * DAY, 1, T0 + 1 * DAY)).toBe(false);
    expect(isDue(T0, T0 + 3 * DAY, 1, T0 + 1 * DAY)).toBe(true);
    expect(isDue(T0, T0 + 7 * DAY, 2, T0 + 3 * DAY)).toBe(true);
  });
  it("3回送ったら、もう送らない", () => {
    expect(isDue(T0, T0 + 30 * DAY, 3, T0 + 7 * DAY)).toBe(false);
  });
  it("遅れて宛先が増えても、1日に1回までしか送らない", () => {
    // 5日目に初めて通知をオンにした人: 1日目ぶんだけ送り、翌日以降に続きを送る
    expect(isDue(T0, T0 + 5 * DAY, 0, null)).toBe(true);
    expect(isDue(T0, T0 + 5 * DAY + 1000, 1, T0 + 5 * DAY)).toBe(false);
    expect(isDue(T0, T0 + 6 * DAY, 1, T0 + 5 * DAY)).toBe(true);
  });
});

describe("notificationText", () => {
  it("回数が増えるほど、はっきりした言い方にする。金額と会の名前を入れ、幹事の名前は出さない", () => {
    const a = notificationText(0, "ゼミの打ち上げ", 4500);
    const c = notificationText(2, "ゼミの打ち上げ", 4500);
    expect(a.title).toContain("ゼミの打ち上げ");
    expect(a.body).toContain("4,500円");
    expect(c.body).toContain("最後");
    expect(a.body).not.toBe(c.body);
  });
});

describe("parsePushSub", () => {
  const ok = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" };
  it("https の宛先と、決まった形の鍵だけを通す", () => {
    expect(parsePushSub(ok)).toEqual(ok);
  });
  it("http・空白入り・鍵の形がおかしいもの・足りないものは通さない", () => {
    expect(parsePushSub({ ...ok, endpoint: "http://x.example/a" })).toBeNull();
    expect(parsePushSub({ ...ok, endpoint: "https://x.example/a b" })).toBeNull();
    expect(parsePushSub({ ...ok, auth: "<script>" })).toBeNull();
    expect(parsePushSub({ endpoint: ok.endpoint })).toBeNull();
    expect(parsePushSub(null)).toBeNull();
  });
});

function fakeStore(col: Collection, subs: PushSub[]) {
  const log = { sent: [] as string[], removed: [] as string[] };
  const store = {
    listAutoRemind: async () => [col],
    listPushSubs: async () => subs,
    markPushSent: async (_c: string, _p: number, endpoint: string, at: number) => {
      const s = subs.find((x) => x.endpoint === endpoint)!;
      s.sentCount += 1;
      s.lastSentAt = at;
    },
    removePushSub: async (_c: string, _p: number, endpoint: string) => {
      log.removed.push(endpoint);
    },
  } as unknown as Store;
  return { store, log };
}

const col: Collection = {
  id: "c1",
  title: "ゼミ",
  audience: "student",
  total: 9000,
  adminHash: "x",
  autoRemindAt: T0,
  payments: { 3: { by: "host" } },
  people: [
    { id: 1, name: "幹事", label: "", mark: "", tone: "yellow", amount: 3000, organizer: true },
    { id: 2, name: "あおい", label: "", mark: "", tone: "yellow", amount: 3000, organizer: false },
    { id: 3, name: "いずみ", label: "", mark: "", tone: "yellow", amount: 3000, organizer: false },
  ],
};
const sub = (personId: number, endpoint: string): PushSub => ({ collectionId: "c1", personId, endpoint, p256dh: "k", auth: "a", sentCount: 0, lastSentAt: null });

describe("runReminders", () => {
  it("払っていない人にだけ送る(幹事と、受け取り済みの人には送らない)", async () => {
    const subs = [sub(1, "e1"), sub(2, "e2"), sub(3, "e3")];
    const { store } = fakeStore(col, subs);
    const sent: string[] = [];
    const send: Sender = async (s) => {
      sent.push(s.endpoint);
      return "ok";
    };
    const r = await runReminders({ store, send, now: T0 + 1 * DAY });
    expect(sent).toEqual(["e2"]);
    expect(r).toMatchObject({ collections: 1, sent: 1, removed: 0, failed: 0 });
    expect(subs[1].sentCount).toBe(1);
  });
  it("時期が来ていなければ送らない", async () => {
    const { store } = fakeStore(col, [sub(2, "e2")]);
    const r = await runReminders({ store, send: async () => "ok", now: T0 + 0.2 * DAY });
    expect(r.sent).toBe(0);
  });
  it("届かなくなった宛先は消し、失敗は数えるだけ(次の日にまた試す)", async () => {
    const subs = [sub(2, "gone"), sub(2, "bad")];
    const { store, log } = fakeStore(col, subs);
    const send: Sender = async (s) => (s.endpoint === "gone" ? "gone" : "error");
    const r = await runReminders({ store, send, now: T0 + 1 * DAY });
    expect(log.removed).toEqual(["gone"]);
    expect(r).toMatchObject({ sent: 0, removed: 1, failed: 1 });
    expect(subs[1].sentCount).toBe(0);
  });
});
