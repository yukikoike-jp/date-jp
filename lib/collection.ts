import { isAudience, normalizeAudience, type Audience } from "./audience";
import { ROUND_UNITS, splitBill, subsidyTotal, CUSTOM_MAX, CUSTOM_MIN } from "./split";
import type { CollectionPerson, PayMethod, Payment } from "./store/types";

// 傾斜会計から集金のページを作るときの、入力の確かめと金額の計算し直し。純粋関数

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const TONES = ["red", "blue", "yellow", "green", "purple", "gray"] as const;

export type CollectionInput = {
  title: unknown;
  audience: unknown;
  total: unknown;
  unit: unknown;
  organizer: unknown;
  people: unknown;
  /** 会社や部署からの補助。{ kind: "per" | "lump", yen } */
  subsidy?: unknown;
};

export type ParsedCollection = { title: string; audience: Audience; total: number; subsidy: number; people: CollectionPerson[] };

/** 画面から来た値を確かめ、金額はサーバーで計算し直す(画面の金額は信じない) */
export function parseCollection(input: CollectionInput): Result<ParsedCollection> {
  const total = Number(input.total);
  if (!Number.isInteger(total) || total < 1 || total > 9_999_999) return { ok: false, error: "お会計の合計を入れてください" };
  const unit = Number(input.unit);
  if (!(ROUND_UNITS as readonly number[]).includes(unit)) return { ok: false, error: "何円単位にそろえるかを選んでください" };
  const raw = Array.isArray(input.people) ? (input.people as Record<string, unknown>[]) : [];
  if (raw.length < 2 || raw.length > 30) return { ok: false, error: "2人から30人までにしてください" };
  const organizer = Number(input.organizer);
  if (!Number.isInteger(organizer) || organizer < 0 || organizer >= raw.length) return { ok: false, error: "幹事を選んでください" };

  const rows: Omit<CollectionPerson, "amount" | "organizer">[] = [];
  const tenths: number[] = [];
  for (const [i, p] of raw.entries()) {
    const name = typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 20) : `${i + 1}人目`;
    const t = Number(p.tenths);
    if (!Number.isInteger(t) || t < CUSTOM_MIN || t > CUSTOM_MAX) return { ok: false, error: `${name}さんの倍率を確かめてください` };
    const tone = TONES.find((x) => x === p.tone) ?? "gray";
    rows.push({
      id: i + 1,
      name,
      label: typeof p.label === "string" ? p.label.slice(0, 10) : "",
      mark: typeof p.mark === "string" ? p.mark.slice(0, 2) : "",
      tone,
    });
    tenths.push(t);
  }
  const raw2 = (input.subsidy ?? null) as { kind?: unknown; yen?: unknown } | null;
  const subsidy = subsidyTotal(
    raw2 && (raw2.kind === "per" || raw2.kind === "lump") ? { kind: raw2.kind, yen: Number(raw2.yen) } : null,
    total,
    rows.length,
  );
  // 補助を引いた残りを、みんなで割る
  const { amounts } = splitBill({ total: total - subsidy, weights: tenths, unit, organizer });
  return {
    ok: true,
    value: {
      title: typeof input.title === "string" ? input.title.trim().slice(0, 30) : "",
      audience: isAudience(input.audience) ? normalizeAudience(input.audience) : "private",
      total,
      subsidy,
      people: rows.map((r, i) => ({ ...r, amount: amounts[i], organizer: i === organizer })),
    },
  };
}

/**
 * 払ったかどうかを変えてよいか。幹事は何でも変えられる。
 */
export function canSetPayment(isHost: boolean): boolean {
  return isHost;
}

/**
 * 「払った」を押したときの、次の記録(2026-11-20 から2段階)。
 * 参加した人は自分で「払った」を押せる(by: "self" = 申告。幹事が確かめるまで、払ったとは数えない)。
 * 幹事が受け取ったもの(by: "host")は、参加した人からは変えられない。参加した人が消せるのは、自分の申告だけ。
 * forbidden = 変えてはいけない
 */
export function nextPayment(isHost: boolean, current: Payment | undefined, paid: boolean, method?: PayMethod | null): Payment | null | "forbidden" {
  // 払い方は、選んだものを使う。幹事が申告を確かめるときは、本人が選んだ払い方を引き継ぐ
  const m = method ?? current?.method;
  const withMethod = (by: Payment["by"]): Payment => (m ? { by, method: m } : { by });
  if (isHost) return paid ? withMethod("host") : null;
  if (paid) return isConfirmed(current) ? "forbidden" : withMethod("self");
  return current?.by === "self" ? null : "forbidden";
}

/** 払い方の並びと名前 */
export const PAY_METHODS: { key: PayMethod; label: string }[] = [
  { key: "paypay", label: "PayPay" },
  { key: "cash", label: "現金" },
  { key: "bank", label: "振込" },
];

export function isPayMethod(v: unknown): v is PayMethod {
  return v === "paypay" || v === "cash" || v === "bank";
}

export function payMethodLabel(m: PayMethod | undefined): string | null {
  return PAY_METHODS.find((x) => x.key === m)?.label ?? null;
}

/** その場で集める画面を、Tsudoro+ なしで使える人数(払う人の数)。これより多い会は Tsudoro+ */
export const FREE_LIVE_PAYERS = 10;

/** 払ったと数えるか。幹事が受け取りを記録したものだけ(前に本人が押した「払った」は、幹事が確かめるまで数えない) */
export function isConfirmed(payment: Payment | undefined): boolean {
  return payment?.by === "host";
}
