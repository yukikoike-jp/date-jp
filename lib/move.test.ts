import { describe, expect, it } from "vitest";
import { decodeMove, encodeMove, isOurKey, mergeStorage } from "./move";

describe("isOurKey", () => {
  it("このアプリの保存だけを引き継ぐ", () => {
    expect(isOurKey("nomi:parties")).toBe(true);
    expect(isOurKey("date:pro")).toBe(true);
    expect(isOurKey("other-app:token")).toBe(false);
  });
});

describe("mergeStorage", () => {
  it("新しいアドレスにないものは、そのまま入れる", () => {
    expect(mergeStorage({}, { "nomi:me:abc": '{"answerId":"x"}', "date:pro": "cs_1.sig" })).toEqual({
      "nomi:me:abc": '{"answerId":"x"}',
      "date:pro": "cs_1.sig",
    });
  });

  it("新しいアドレスにすでにあるものは、上書きしない", () => {
    expect(mergeStorage({ "nomi:audience": "worker" }, { "nomi:audience": "student" })).toEqual({});
  });

  it("作った会の一覧は id でまとめ、重ならないものだけを足す", () => {
    const current = { "nomi:parties": JSON.stringify([{ id: "a", title: "新" }]) };
    const incoming = { "nomi:parties": JSON.stringify([{ id: "a", title: "古" }, { id: "b", title: "前の会" }]) };
    const out = mergeStorage(current, incoming);
    expect(JSON.parse(out["nomi:parties"])).toEqual([
      { id: "a", title: "新" },
      { id: "b", title: "前の会" },
    ]);
  });

  it("足すものがなければ、何も変えない。壊れたデータや、ほかのアプリの保存は無視する", () => {
    expect(mergeStorage({ "nomi:parties": '[{"id":"a"}]' }, { "nomi:parties": '[{"id":"a"}]' })).toEqual({});
    expect(mergeStorage({}, { "nomi:parties": "これは壊れている", "evil:key": "x" })).toEqual({});
  });
});

describe("encodeMove / decodeMove", () => {
  it("日本語を含んでも、そのまま行き来できる", () => {
    const data = { "nomi:parties": JSON.stringify([{ id: "a", title: "忘年会🍺" }]), "date:pro": "cs_1.sig" };
    expect(decodeMove(encodeMove(data))).toEqual(data);
  });
  it("壊れた文字列や、ほかのアプリの保存は受け取らない", () => {
    expect(decodeMove("!!!")).toBeNull();
    expect(decodeMove(encodeMove({ "evil:key": "x" } as Record<string, string>))).toEqual({});
  });
});
