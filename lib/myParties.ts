// この端末で作った会。幹事の URL をなくさないよう、ブラウザにだけ残す

export type MyParty = { id: string; title: string; token: string; createdAt: number };

const KEY = "nomi:parties";

export function loadMyParties(): MyParty[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MyParty[]) : [];
  } catch {
    return [];
  }
}

export function rememberParty(p: MyParty) {
  try {
    const list = loadMyParties().filter((x) => x.id !== p.id);
    localStorage.setItem(KEY, JSON.stringify([p, ...list].slice(0, 30)));
  } catch {}
}

/** この端末の一覧から外す(会そのものは消えない)。外したものを返す(元に戻すとき用) */
export function forgetParty(id: string): MyParty | null {
  try {
    const list = loadMyParties();
    const gone = list.find((x) => x.id === id) ?? null;
    localStorage.setItem(KEY, JSON.stringify(list.filter((x) => x.id !== id)));
    return gone;
  } catch {
    return null;
  }
}
