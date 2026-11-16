import { createClient } from "@supabase/supabase-js";
import { isAudience } from "../audience";
import type { Answer } from "../summary";
import { countAds, countShops } from "./stats";
import type { AdEventKind, Collection, CollectionPerson, Decision, Payment, Store, StoredAnswer } from "./types";

// スキーマから型を生成していないので、行の型は呼び出し側で指定する
function check<T = unknown>(result: { data: unknown; error: { message: string; code?: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

type AnswerRow = { id: string; name: string; token_hash: string; data: Omit<Answer, "id" | "name"> };

export function createSupabaseStore(url: string, serviceRoleKey: string): Store {
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const store: Store = {
    async createParty(party) {
      check(
        await db.from("nomi_parties").insert({
          id: party.id,
          title: party.title,
          audience: party.audience,
          dates: party.dates,
          admin_hash: party.adminHash,
          start_minutes: party.start,
          via: party.via,
          // 締め切りのない会は欄に何も書かない(締め切りの欄を足す前の DB でも作れるようにする)
          ...(party.deadline ? { answer_deadline: party.deadline } : {}),
        }),
      );
    },
    async getParty(id) {
      const row = check<
        { id: string; title: string; audience: string; dates: string[]; admin_hash: string; decision: Decision | null; start_minutes: number | null; answer_deadline: string | null; must_names: string[] | null } | null
      >(
        await db.from("nomi_parties").select("id, title, audience, dates, admin_hash, decision, start_minutes, answer_deadline, must_names").eq("id", id).maybeSingle(),
      );
      return row ? {
            id: row.id,
            title: row.title,
            audience: isAudience(row.audience) ? row.audience : "student",
            dates: row.dates,
            adminHash: row.admin_hash,
            decision: row.decision,
            start: row.start_minutes ?? null,
            deadline: row.answer_deadline ?? null,
            must: row.must_names ?? [],
          } : null;
    },
    async listAnswers(partyId) {
      const rows = check<AnswerRow[]>(
        await db.from("nomi_answers").select("id, name, token_hash, data").eq("party_id", partyId).order("created_at"),
      );
      return rows.map((r): StoredAnswer => ({ ...r.data, id: r.id, name: r.name, tokenHash: r.token_hash }));
    },
    async saveAnswer(partyId, answer) {
      const { id, name, tokenHash, ...data } = answer;
      const result = await db
        .from("nomi_answers")
        .upsert({ id, party_id: partyId, name, token_hash: tokenHash, data, updated_at: new Date().toISOString() });
      // 同じ飲み会で同じ名前(unique 制約)
      if (result.error?.code === "23505") return false;
      check(result);
      return true;
    },
    async setMust(partyId, names) {
      check(await db.from("nomi_parties").update({ must_names: names }).eq("id", partyId));
    },
    async setDecision(partyId, decision) {
      check(await db.from("nomi_parties").update({ decision }).eq("id", partyId));
    },
    async logShopClick(partyId, shopId) {
      check(await db.from("nomi_shop_clicks").insert({ party_id: partyId, shop_id: shopId }));
    },
    async getStats(since) {
      const at = since.toISOString();
      const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
        const r = await q;
        if (r.error) throw new Error(r.error.message);
        return r.count ?? 0;
      };
      const head = { count: "exact" as const, head: true };
      const [parties, decided, answers, totalParties, totalClicks, clickRows, fromGuests] = await Promise.all([
        count(db.from("nomi_parties").select("id", head).gte("created_at", at)),
        count(db.from("nomi_parties").select("id", head).gte("created_at", at).not("decision", "is", null)),
        count(db.from("nomi_answers").select("id", head).gte("created_at", at)),
        count(db.from("nomi_parties").select("id", head)),
        count(db.from("nomi_shop_clicks").select("id", head)),
        db.from("nomi_shop_clicks").select("shop_id").gte("created_at", at).limit(10000),
        count(db.from("nomi_parties").select("id", head).gte("created_at", at).eq("via", "guest")),
      ]);
      const ids = check<{ shop_id: string }[]>(clickRows).map((r) => r.shop_id);
      return { parties, decided, answers, clicks: ids.length, topShops: countShops(ids), totalParties, totalClicks, fromGuests };
    },
    async getTimeline(since) {
      const at = since.toISOString();
      const times = async (table: string) =>
        check<{ created_at: string }[]>(await db.from(table).select("created_at").gte("created_at", at).limit(50000)).map((r) =>
          new Date(r.created_at).getTime(),
        );
      const [parties, answers, clicks] = await Promise.all([times("nomi_parties"), times("nomi_answers"), times("nomi_shop_clicks")]);
      return { parties, answers, clicks };
    },
    async logAdEvent(sponsorId, kind) {
      check(await db.from("nomi_ad_events").insert({ sponsor_id: sponsorId, kind }));
    },
    async getAdStats(since) {
      const rows = check<{ sponsor_id: string; kind: AdEventKind }[]>(
        await db.from("nomi_ad_events").select("sponsor_id, kind").gte("created_at", since.toISOString()).limit(100000),
      );
      return countAds(rows.map((r) => ({ sponsorId: r.sponsor_id, kind: r.kind })));
    },
    async createCollection(collection) {
      const { id, adminHash, ...data } = collection;
      check(await db.from("nomi_collections").insert({ id, admin_hash: adminHash, data }));
    },
    async getCollection(id) {
      const [row, pays] = await Promise.all([
        db.from("nomi_collections").select("id, admin_hash, data").eq("id", id).maybeSingle(),
        db.from("nomi_collection_payments").select("person_id, paid_by").eq("collection_id", id),
      ]);
      const r = check<{ id: string; admin_hash: string; data: Omit<Collection, "id" | "adminHash" | "payments"> & { people: CollectionPerson[] } } | null>(row);
      if (!r) return null;
      const payments: Record<number, Payment> = {};
      for (const p of check<{ person_id: number; paid_by: string }[]>(pays)) {
        payments[p.person_id] = { by: p.paid_by === "host" ? "host" : "self" };
      }
      return { ...r.data, audience: isAudience(r.data.audience) ? r.data.audience : "student", id: r.id, adminHash: r.admin_hash, payments };
    },
    async setPayment(collectionId, personId, payment) {
      if (payment) {
        check(
          await db
            .from("nomi_collection_payments")
            .upsert({ collection_id: collectionId, person_id: personId, paid_by: payment.by, paid_at: new Date().toISOString() }),
        );
      } else {
        check(await db.from("nomi_collection_payments").delete().eq("collection_id", collectionId).eq("person_id", personId));
      }
    },
    async setCollectionSettings(collectionId, patch) {
      // 設定は data(jsonb)の中に入れている。読んで、変えて、書き戻す
      const row = check<{ data: Record<string, unknown> } | null>(await db.from("nomi_collections").select("data").eq("id", collectionId).maybeSingle());
      if (!row) return;
      const data = { ...row.data };
      if (patch.payLink !== undefined) {
        if (patch.payLink === null) delete data.payLink;
        else data.payLink = patch.payLink;
      }
      if (patch.autoRemindAt !== undefined) {
        if (patch.autoRemindAt === null) delete data.autoRemindAt;
        else data.autoRemindAt = patch.autoRemindAt;
      }
      check(await db.from("nomi_collections").update({ data }).eq("id", collectionId));
    },
    async listAutoRemind() {
      const rows = check<{ id: string }[]>(await db.from("nomi_collections").select("id").not("data->autoRemindAt", "is", null).limit(500));
      const out: Collection[] = [];
      for (const r of rows) {
        const c = await store.getCollection(r.id);
        if (c) out.push(c);
      }
      return out;
    },
    async addPushSub(sub) {
      check(
        await db.from("nomi_push_subs").upsert({
          collection_id: sub.collectionId,
          person_id: sub.personId,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        }),
      );
    },
    async listPushSubs(collectionId) {
      const rows = check<{ collection_id: string; person_id: number; endpoint: string; p256dh: string; auth: string; sent_count: number; last_sent_at: string | null }[]>(
        await db.from("nomi_push_subs").select("collection_id, person_id, endpoint, p256dh, auth, sent_count, last_sent_at").eq("collection_id", collectionId),
      );
      return rows.map((r) => ({
        collectionId: r.collection_id,
        personId: r.person_id,
        endpoint: r.endpoint,
        p256dh: r.p256dh,
        auth: r.auth,
        sentCount: r.sent_count,
        lastSentAt: r.last_sent_at ? new Date(r.last_sent_at).getTime() : null,
      }));
    },
    async markPushSent(collectionId, personId, endpoint, at) {
      const row = check<{ sent_count: number } | null>(
        await db.from("nomi_push_subs").select("sent_count").eq("collection_id", collectionId).eq("endpoint", endpoint).maybeSingle(),
      );
      if (!row) return;
      check(
        await db
          .from("nomi_push_subs")
          .update({ sent_count: row.sent_count + 1, last_sent_at: new Date(at).toISOString(), person_id: personId })
          .eq("collection_id", collectionId)
          .eq("endpoint", endpoint),
      );
    },
    async removePushSub(collectionId, _personId, endpoint) {
      check(await db.from("nomi_push_subs").delete().eq("collection_id", collectionId).eq("endpoint", endpoint));
    },
  };
  return store;
}
