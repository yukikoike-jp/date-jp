import { describe, expect, it } from "vitest";
import { POST as createParty } from "./parties/route";
import { GET as getParty } from "./parties/[id]/route";
import { POST as decide } from "./parties/[id]/decision/route";
import { PUT as setMust } from "./parties/[id]/must/route";
import { POST as saveAnswer } from "./parties/[id]/answers/route";
import { GET as getMyAnswer } from "./parties/[id]/answers/[answerId]/route";
import { GET as attendees } from "./parties/[id]/attendees/route";
import { POST as searchShops } from "./shops/search/route";

// 仮DB(メモリ)で、API の形と鍵の照合を確かめる。鍵の照合が壊れたら、ここで落ちる

const DATE = "2026-12-04";
const answer = { name: "山田", dates: { [DATE]: "ok" }, stay: 1320, budget: 4000, areas: [] };

function req(method: string, init: { body?: unknown; token?: string; headers?: Record<string, string> } = {}) {
  return new Request("http://localhost/api/v1/x", {
    method,
    headers: { "content-type": "application/json", ...(init.token ? { authorization: `Bearer ${init.token}` } : {}), ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

// Route Handler の第2引数(params は Promise)
const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) }) as never;

async function newParty() {
  const res = await createParty(req("POST", { body: { title: "忘年会", audience: "private", dates: [DATE], start: 1140 } }));
  expect(res.status).toBe(201);
  return (await res.json()) as { ok: true; id: string; adminToken: string };
}

describe("API v1", () => {
  it("会の中身に、幹事の鍵のハッシュを出さない。鍵が合うかは admin で分かる", async () => {
    const { id, adminToken } = await newParty();
    const guest = await (await getParty(req("GET"), ctx({ id }))).json();
    expect(guest.ok).toBe(true);
    expect(JSON.stringify(guest)).not.toContain("adminHash");
    expect(guest.admin).toBe(false);
    expect(guest.share.invite).toContain(`/p/${id}`);
    expect(typeof guest.pr).toBe("boolean");
    expect(guest.notice).toBeNull();
    const host = await (await getParty(req("GET", { token: adminToken }), ctx({ id }))).json();
    expect(host.admin).toBe(true);
  });

  it("ない会は 404", async () => {
    expect((await getParty(req("GET"), ctx({ id: "nothere234" }))).status).toBe(404);
  });

  it("幹事の鍵が違うと、決められない・必ず来てほしい人も変えられない・行く人も読めない", async () => {
    const { id, adminToken } = await newParty();
    await saveAnswer(req("POST", { body: { answer } }), ctx({ id }));

    const bad = await decide(req("POST", { body: { date: DATE }, token: "wrong" }), ctx({ id }));
    expect(bad.status).toBe(400);
    expect((await (await getParty(req("GET"), ctx({ id }))).json()).party.decision).toBeNull();
    expect((await setMust(req("PUT", { body: { names: ["山田"] } }), ctx({ id }))).status).toBe(400);

    const good = await decide(req("POST", { body: { date: DATE }, token: adminToken }), ctx({ id }));
    expect(good.status).toBe(200);
    expect((await (await getParty(req("GET"), ctx({ id }))).json()).party.decision.date).toBe(DATE);

    expect((await attendees(req("GET", { token: "wrong" }), ctx({ id }))).status).toBe(404);
    const list = await (await attendees(req("GET", { token: adminToken }), ctx({ id }))).json();
    expect(list.attendees).toEqual([{ name: "山田", soft: false }]);
  });

  it("自分の回答は、本人の鍵でだけ読めて直せる", async () => {
    const { id } = await newParty();
    const saved = await (await saveAnswer(req("POST", { body: { answer } }), ctx({ id }))).json();
    expect(saved.ok).toBe(true);

    const mine = await getMyAnswer(req("GET", { headers: { "x-answer-token": saved.token } }), ctx({ id, answerId: saved.answerId }));
    expect((await mine.json()).answer.budget).toBe(4000);
    const other = await getMyAnswer(req("GET", { headers: { "x-answer-token": "wrong" } }), ctx({ id, answerId: saved.answerId }));
    expect(other.status).toBe(404);

    const fixed = await (await saveAnswer(req("POST", { body: { answer: { ...answer, budget: 5000 }, answerId: saved.answerId, token: saved.token } }), ctx({ id }))).json();
    expect(fixed.answerId).toBe(saved.answerId);
    const again = await getMyAnswer(req("GET", { headers: { "x-answer-token": saved.token } }), ctx({ id, answerId: saved.answerId }));
    expect((await again.json()).answer.budget).toBe(5000);
  });

  it("お店を探すと、お店と提携リンクかどうかを返す。駅がなければ空", async () => {
    const station = { name: "仙台", pref: "宮城県", lat: 38.260027, lng: 140.882158 };
    const first = await (await searchShops(req("POST", { body: { station, genres: [], budget: null, privateRoom: false, audience: "private" } }))).json();
    expect(first.ok).toBe(true);
    expect(first.shops.length).toBeGreaterThan(0);
    expect(typeof first.pr).toBe("boolean");
    const second = await (await searchShops(req("POST", { body: { station, genres: [], budget: null, privateRoom: false, second: { genre: "bar" }, audience: "private" } }))).json();
    expect(Array.isArray(second.shops)).toBe(true);
    const none = await (await searchShops(req("POST", { body: { station: null, genres: [], audience: "private" } }))).json();
    expect(none.shops).toEqual([]);
  });

  it("読めないボディは 400", async () => {
    const res = await createParty(new Request("http://localhost/api/v1/parties", { method: "POST", body: "not json" }));
    expect(res.status).toBe(400);
  });
});
