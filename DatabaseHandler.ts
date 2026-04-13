
import { MongoClient, Db, Collection, ClientSession, ObjectId, Filter, UpdateFilter, WithId, Document } from 'mongodb';
import { Ctx } from "../lib/ctx";
import { getCanonicalUserJid, getEquivalentUserJids, getJidUserPart, isUsableHumanName } from '../lib/identity/displayName';
import { appendSpendingHistoryEntry } from '../lib/economy/economyStatement';
import {
  depositIntoLegacyBank,
  depositIntoOwnBankAccount as depositIntoRealBankAccount,
  getTotalUserBankBalance,
  withdrawFromLegacyBank,
  withdrawFromOwnBankAccount as withdrawFromRealBankAccount,
} from '../lib/economy/banking';
import { isNewBankSystemEnabled } from '../lib/economy/bankSystemSettings';
import type { MarriedHaigushaDocument, PendingHaigushaDocument } from '../lib/social/haigusha';
import { normalizeBotInstanceName } from '../lib/bot/botInstance';
import { getStats } from '../lib/progression/stats';

// ─── MongoDB connection ───────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGO_DB  = process.env.MONGODB_DB  || 'bnhh';

let _client: MongoClient | null = null;
let _db: Db | null = null;

async function getMongoDb(): Promise<Db> {
  if (_db) return _db;
  _client = new MongoClient(MONGO_URI);
  await _client.connect();
  _db = _client.db(MONGO_DB);
  console.log(`[MongoDB] Connected to "${MONGO_DB}"`);
  return _db;
}

/**
 * Thin helper that mirrors the Firestore-style API used throughout the handler
 * so callers need minimal changes.
 *
 *   db.collection('users').doc(id).get()
 *   db.collection('users').doc(id).set(data)          // replaces document
 *   db.collection('users').doc(id).update(data)        // partial update
 *   db.collection('users').doc(id).delete()
 *   db.collection('users').where(field, '==', val).get()
 *   db.collection('users').get()                       // full collection scan
 *   db.runTransaction(fn)                              // session-based transaction
 */
function makeDb() {
  function collection(colName: string) {
    function doc(docId: string) {
      return {
        get: async () => {
          const mdb = await getMongoDb();
          const col = mdb.collection(colName);
          const raw = await col.findOne({ _id: docId as any });
          return makeSnapshot(docId, raw);
        },
        set: async (data: Record<string, any>) => {
          const mdb = await getMongoDb();
          const col = mdb.collection(colName);
          // Replaces the document entirely (no merge)
          await col.replaceOne({ _id: docId as any }, { _id: docId as any, ...data }, { upsert: true });
        },
        update: async (data: Record<string, any>) => {
          const mdb = await getMongoDb();
          const col = mdb.collection(colName);
          await col.updateOne({ _id: docId as any }, { $set: data }, { upsert: true });
        },
        delete: async () => {
          const mdb = await getMongoDb();
          await mdb.collection(colName).deleteOne({ _id: docId as any });
        },
        id: docId,
        ref: { id: docId },
        collection: (subColName: string) => collection(`${colName}/${docId}/${subColName}`),
      };
    }

    function where(field: string, op: '==' | '!=' | '<' | '<=' | '>' | '>=', value: any) {
      const filter: Record<string, any> = {};
      const opMap: Record<string, string> = {
        '==': '$eq', '!=': '$ne',
        '<': '$lt', '<=': '$lte',
        '>': '$gt', '>=': '$gte',
      };
      filter[field] = { [opMap[op]]: value };

      return {
        get: async () => {
          const mdb = await getMongoDb();
          const docs = await mdb.collection(colName).find(filter).toArray();
          return {
            docs: docs.map((d) => makeSnapshot(String(d._id), d)),
            forEach: (fn: (snap: ReturnType<typeof makeSnapshot>) => void) => {
              docs.forEach((d) => fn(makeSnapshot(String(d._id), d)));
            },
          };
        },
        where: (f2: string, op2: '==' | '!=' | '<' | '<=' | '>' | '>=', v2: any) => {
          // chained where – merge filters
          const f2op = (opMap as any)[op2] || '$eq';
          filter[f2] = { [f2op]: v2 };
          return {
            get: async () => {
              const mdb = await getMongoDb();
              const docs = await mdb.collection(colName).find(filter).toArray();
              return { docs: docs.map((d) => makeSnapshot(String(d._id), d)) };
            },
          };
        },
      };
    }

    return {
      doc,
      where,
      get: async () => {
        const mdb = await getMongoDb();
        const docs = await mdb.collection(colName).find({}).toArray();
        return {
          docs: docs.map((d) => makeSnapshot(String(d._id), d)),
          forEach: (fn: (snap: ReturnType<typeof makeSnapshot>) => void) => {
            docs.forEach((d) => fn(makeSnapshot(String(d._id), d)));
          },
        };
      },
      add: async (data: Record<string, any>) => {
        const mdb = await getMongoDb();
        const result = await mdb.collection(colName).insertOne(data);
        return { id: String(result.insertedId) };
      },
    };
  }

  async function runTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    if (!_client) await getMongoDb();
    const session = _client!.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  return { collection, runTransaction };
}

/**
 * Create a Firestore-like snapshot object from a raw MongoDB document.
 */
function makeSnapshot(id: string, raw: Record<string, any> | null) {
  return {
    id,
    exists: raw !== null,
    data: () => {
      if (!raw) return undefined;
      const { _id, ...rest } = raw;
      return rest;
    },
    ref: { id },
  };
}

// ─── Module-level db handle ───────────────────────────────────────────────────

export const db = makeDb();

// ─── Shared context ───────────────────────────────────────────────────────────

let currentCtx: Ctx | null = null;
export function setGlobalCtx(ctx: Ctx) { currentCtx = ctx; }

// ─── Utility helpers ──────────────────────────────────────────────────────────

function getUserDocumentBankBalance(data?: any): number {
  if (!data || typeof data !== 'object') return 0;
  return getTotalUserBankBalance(data);
}

function getUserDocumentBankAccounts(data?: any): any[] {
  return Array.isArray(data?.bankAccounts) ? data.bankAccounts : [];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Move   { name: string; power: number; type: string; }
interface Ability { ability: { name: string; url: string }; is_hidden: boolean; }

interface IPokemon {
  id: number;
  abilities: { ability: { name: string; url: string }; is_hidden: boolean }[];
  base_experience: number; height: number; weight: number;
  sprites: { front_default: string; other: { 'official-artwork': { front_default: string } } };
  types: { type: { name: string } }[];
}

interface CaughtPokemon {
  pokemonId: number; name: string; level: number; timestamp: string; hp: number;
  abilities: { ability: { name: string; url: string }; is_hidden: boolean }[];
  moves: { move: { name: string; url: string } }[];
  sprites: { front_default: string; other: { 'official-artwork': { front_default: string } } };
  id: number; base_experience: number; height: number; weight: number;
  types: { type: { name: string; url: string } }[];
}

interface BlackMarketBoost { time: number; multiplier: number; }

interface AfkDocument {
  active: boolean; reason: string | null; since: number | null;
  sticky?: boolean; updatedAt?: number;
}

interface MarriageDocument { spouseId?: string | null; marriedAt?: number | null; }

interface PendingMarriageDocument {
  direction?: 'incoming' | 'outgoing'; userId?: string | null; createdAt?: number | null;
}

interface BotRatingDocument { score?: number; ratedAt?: number; }

interface SpendingHistoryEntry {
  amount: number; category: string; detail?: string;
  timestamp: number; direction?: 'income' | 'expense' | 'transfer';
}

interface ClaimedCard {
  cardId: string; title: string; tier: string; price: number; url: string; timestamp: Date;
}

interface UserDocument {
  firstName?: string; username?: string; password?: string;
  actingAs?: string; actingAsSetAt?: number; originalNum?: string; originalNumSetAt?: number;
  phone?: string; phoneNumber?: string; role?: string | null;
  roleGrantedAt?: number | null; roleGrantedBy?: string | null; roleExpiresAt?: number | null;
  jid?: string; whatsappJid?: string; wallet?: number; gamble?: number; bank?: number;
  bankAccounts?: Array<{
    bankId: string; accountNumber: string; balance: number; openedAt: number;
    nextFeeAt: number; unpaidFees: number; status: 'active' | 'suspended';
    lastFeePaidAt?: number | null;
  }>;
  Xp?: number; bio?: string; lastBioUpdateAt?: number; lastCommandAt?: number;
  lastCommandDayKey?: string; level?: number; ban?: boolean; downloadCount?: number;
  lastDownload?: number; caughtPokemons?: CaughtPokemon[]; lastDaily?: number;
  lastRob?: number; rouletteCooldown?: number; slotCooldown?: number;
  lastGambleExecutionId?: string; claimedCards?: ClaimedCard[]; profilePicture?: string;
  black_market?: { boost: BlackMarketBoost }; usernameChanges?: number;
  lastUsernameChange?: number; crime?: number; items?: { [key: string]: number };
  activeEffects?: { [key: string]: number }; activeEffectExpiry?: { [key: string]: number };
  storePurchases?: { [key: string]: number }; storePriceDayKey?: string;
  storePriceCounts?: { [key: string]: number }; spendingHistory?: SpendingHistoryEntry[];
  jailedUntil?: number; bailAmount?: number; work?: number; beg?: { cooldown: string };
  banned?: boolean; bannedReason?: string | null; bannedBy?: string | null;
  bannedAt?: number | null; unbannedAt?: number | null; callWarningCount?: number;
  lastCallAt?: number | null; callBlockedAt?: number | null;
  loan?: { amount: number; due: number; paid: boolean; tamount: number };
  afk?: AfkDocument; marriage?: MarriageDocument; pendingMarriage?: PendingMarriageDocument;
  streak?: {
    consecutiveDays?: number; lastCommandDayKey?: string | null;
    lastLostStreak?: number; restoreUses?: number; restoreMonthKey?: string | null;
  };
  wrapped?: { lastSentWeekKey?: string; lastSentAt?: number };
  plays?: { title: string; artist: string; url: string; thumbnail?: string | null; timestamp: number }[];
  autoReactEnabled?: boolean; autoReactEmojis?: string[]; autoReactUpdatedAt?: number;
  botRating?: BotRatingDocument; botRatingReminderLastSentAt?: number;
  pendingHaigusha?: PendingHaigushaDocument; marriedHaigusha?: MarriedHaigushaDocument;
}

interface GroupSettingsDocument {
  economy?: boolean; activeBot?: string | null; latestHaigusha?: PendingHaigushaDocument;
  antilink?: boolean; antistatus?: boolean; anime?: boolean; forex?: boolean;
  nsfw?: boolean; roast?: boolean;
  antispam?: {
    enabled?: boolean; maxMessages?: number; windowSeconds?: number;
    duplicateThreshold?: number; cooldownSeconds?: number; action?: 'warn' | 'kick';
  };
  muted?: boolean; mutedBy?: string | null; mutedByOwner?: boolean; mutedAt?: number | null;
  welcome?: boolean; welcomeEnabled?: boolean; welcomeMessage?: string | null;
  welcomeMediaPath?: string | null; welcomeMediaType?: 'image' | 'video' | null;
  welcomeMediaMime?: string | null; welcomeGifPlayback?: boolean;
}

interface RememberedDisplayNameDocument {
  jid?: string; firstName?: string; updatedAt?: number;
}

// ─── In-memory caches ─────────────────────────────────────────────────────────

const USER_CACHE_TTL_MS         = Number(process.env.BNH_USER_CACHE_TTL_MS         || 5_000);
const GROUP_SETTINGS_CACHE_TTL_MS = Number(process.env.BNH_GROUP_SETTINGS_CACHE_TTL_MS || 1_000);
const BOT_SETTINGS_CACHE_TTL_MS = Number(process.env.BNH_BOT_SETTINGS_CACHE_TTL_MS || 1_000);
const GROUP_SETTINGS_ERROR_LOG_COOLDOWN_MS = Number(process.env.BNH_GROUP_SETTINGS_ERROR_LOG_COOLDOWN_MS || 60_000);
const REMEMBERED_DISPLAY_NAME_WRITE_TTL_MS = Number(process.env.BNH_REMEMBERED_DISPLAY_NAME_WRITE_TTL_MS || 10 * 60 * 1000);
const USER_PHONE_LOOKUP_TTL_MS  = Number(process.env.BNH_USER_PHONE_LOOKUP_TTL_MS  || 5 * 60 * 1000);

type Snap = ReturnType<typeof makeSnapshot>;

const userDocCache         = new Map<string, { value: Snap; expires: number }>();
const groupSettingsCache   = new Map<string, { value: GroupSettingsDocument | null; expires: number }>();
const botSettingsCache     = new Map<string, { value: Record<string, any> | null; expires: number }>();
const pendingCacheLoads    = new WeakMap<object, Map<string, Promise<unknown>>>();
const groupSettingsErrorCooldown = new Map<string, number>();
const rememberedDisplayNameWriteCache = new Map<string, { name: string; expires: number }>();
const userPhoneToJidCache  = new Map<string, { jid: string | null; expires: number }>();

function getPendingCacheMap<T>(cache: Map<string, { value: T; expires: number }>): Map<string, Promise<T>> {
  const key = cache as unknown as object;
  if (!pendingCacheLoads.has(key)) pendingCacheLoads.set(key, new Map());
  return pendingCacheLoads.get(key) as Map<string, Promise<T>>;
}

async function getCachedValue<T>(
  cache: Map<string, { value: T; expires: number }>,
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now     = Date.now();
  const useCache = Number.isFinite(ttlMs) && ttlMs > 0;
  if (useCache) {
    const cached = cache.get(key);
    if (cached && cached.expires > now) return cached.value;
  }
  const pending = getPendingCacheMap(cache);
  if (pending.has(key)) return pending.get(key)!;
  const p = loader()
    .then((value) => {
      if (useCache) cache.set(key, { value, expires: Date.now() + ttlMs });
      else cache.delete(key);
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}

function invalidateUserCache(jid?: string | null) {
  if (!jid) return;
  const keys = new Set([String(jid), ...getEquivalentUserJids(jid, { includeLegacyS: true })]);
  for (const k of keys) userDocCache.delete(k);
}

export function invalidateUserDocumentCache(jid?: string | null): void { invalidateUserCache(jid); }

function invalidateUserPhoneLookupCache(phone?: string | null): void {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (digits) userPhoneToJidCache.delete(digits);
}

function invalidateGroupSettingsCache(groupId?: string | null) {
  if (groupId) groupSettingsCache.delete(groupId);
}

function getCachedGroupSettingsValue(groupId?: string | null): GroupSettingsDocument | null | undefined {
  if (!groupId) return undefined;
  const cached = groupSettingsCache.get(groupId);
  return cached ? cached.value : undefined;
}

function invalidateBotSettingsCache(docId?: string | null) {
  if (docId) botSettingsCache.delete(docId);
}

function normalizeBotInstanceLabel(value?: string | null): string | null {
  return normalizeBotInstanceName(value) || null;
}

function toWholeNumber(v: number)            { return Number.isFinite(v) ? Math.trunc(v) : 0; }
function toNonNegativeWholeNumber(v: number) { return Math.max(0, toWholeNumber(v)); }
function toPositiveWholeNumber(v: number)    { return Math.max(0, toWholeNumber(v)); }

function getRandomWholeNumberInRange(min: number, max: number): number {
  const safeMin = toNonNegativeWholeNumber(min);
  const safeMax = Math.max(safeMin, toNonNegativeWholeNumber(max));
  return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
}

function isTransientMongoConnectionError(error: unknown): boolean {
  const candidates = [error, (error as any)?.cause].filter(Boolean);
  return candidates.some((c: any) => {
    const name    = String(c?.name    || '');
    const code    = String(c?.code    || '');
    const message = String(c?.message || '');
    const labels: string[] = Array.isArray(c?.errorLabelSet)
      ? c.errorLabelSet.map(String)
      : c?.errorLabelSet instanceof Set ? [...c.errorLabelSet].map(String) : [];
    return (
      code === 'ECONNRESET' || /ECONNRESET/i.test(message) ||
      /PoolClearedError/i.test(name) || /MongoNetworkError/i.test(name) ||
      /connection pool .* cleared/i.test(message) ||
      labels.some((l) => /ResetPool|PoolRequstedRetry|PoolRequestedRetry/i.test(l))
    );
  });
}

function summarizeError(error: unknown): string {
  const name    = String((error as any)?.name    || 'Error');
  const code    = String((error as any)?.code    || (error as any)?.cause?.code    || '').trim();
  const message = String((error as any)?.message || (error as any)?.cause?.message || error || '').trim();
  return [name, code ? `(${code})` : '', message].filter(Boolean).join(' ');
}

function logGroupSettingsFallback(groupId: string, error: unknown, mode: 'cached' | 'null'): void {
  const key = `${mode}:${groupId}`;
  const now = Date.now();
  if ((groupSettingsErrorCooldown.get(key) || 0) > now) return;
  groupSettingsErrorCooldown.set(key, now + GROUP_SETTINGS_ERROR_LOG_COOLDOWN_MS);
  const summary = summarizeError(error);
  if (mode === 'cached') {
    console.warn(`[DatabaseHandler] Using stale cached group settings for ${groupId} after transient Mongo error: ${summary}`);
  } else {
    console.warn(`[DatabaseHandler] Active bot lookup returned null for ${groupId} after transient Mongo error: ${summary}`);
  }
}

// ─── DatabaseHandler ──────────────────────────────────────────────────────────

export class DatabaseHandler {

  // ── Private helpers ─────────────────────────────────────────────────────────

  private parseBotRating(data?: UserDocument | null): BotRatingDocument | null {
    if (!data || typeof data !== 'object') return null;
    const score = Number(data.botRating?.score || 0);
    if (!Number.isFinite(score) || score < 1 || score > 10) return null;
    const ratedAt = Number(data.botRating?.ratedAt || 0);
    return { score, ratedAt: Number.isFinite(ratedAt) && ratedAt > 0 ? ratedAt : undefined };
  }

  private async getGroupSettingsCached(groupId: string): Promise<GroupSettingsDocument | null> {
    try {
      return await getCachedValue(groupSettingsCache, groupId, GROUP_SETTINGS_CACHE_TTL_MS, async () => {
        const snap = await db.collection('groupSettings').doc(groupId).get();
        return snap.exists ? (snap.data() as GroupSettingsDocument) : null;
      });
    } catch (error) {
      if (isTransientMongoConnectionError(error)) {
        const stale = getCachedGroupSettingsValue(groupId);
        if (stale !== undefined) { logGroupSettingsFallback(groupId, error, 'cached'); return stale; }
      }
      throw error;
    }
  }

  private async getBotSettingsCached(docId: string): Promise<Record<string, any> | null> {
    return getCachedValue(botSettingsCache, docId, BOT_SETTINGS_CACHE_TTL_MS, async () => {
      const snap = await db.collection('botSettings').doc(docId).get();
      return snap.exists ? snap.data() ?? null : null;
    });
  }

  private extractPhoneCandidates(...candidates: Array<string | null | undefined>): string[] {
    return [...new Set(
      candidates
        .map((v) => getJidUserPart(v))
        .map((v) => String(v || '').replace(/[^\d]/g, ''))
        .filter((v) => v.length >= 8)
    )];
  }

  private async lookupCanonicalUserJidByPhone(phone: string): Promise<string | null> {
    const digits = String(phone || '').replace(/[^\d]/g, '');
    if (!digits) return null;

    const cached = userPhoneToJidCache.get(digits);
    if (cached && cached.expires > Date.now()) return cached.jid;

    const fields: Array<'phone' | 'phoneNumber' | 'whatsappJid'> = ['phone', 'phoneNumber', 'whatsappJid'];
    const matchedSnaps: Snap[] = [];

    for (const field of fields) {
      try {
        const result = await db.collection('users').where(field, '==', digits).get();
        matchedSnaps.push(...result.docs);
      } catch {}

      if (field === 'whatsappJid') continue;
      try {
        const jidValue = `${digits}@s.whatsapp.net`;
        const result = await db.collection('users').where(field, '==', jidValue).get();
        matchedSnaps.push(...result.docs);
      } catch {}
    }

    if (!matchedSnaps.length) {
      userPhoneToJidCache.set(digits, { jid: null, expires: Date.now() + USER_PHONE_LOOKUP_TTL_MS });
      return null;
    }

    const unique = [...new Map(
      matchedSnaps.filter((s) => s.exists).map((s) => [s.id, s])
    ).values()];

    const distinctLids = [...new Set(unique.map((s) => s.id).filter((id) => id.endsWith('@lid')))];
    if (distinctLids.length > 1) {
      console.warn(`[DatabaseHandler] Refusing ambiguous phone lookup for ${digits}; multiple @lid docs: ${distinctLids.join(', ')}`);
      userPhoneToJidCache.set(digits, { jid: null, expires: Date.now() + USER_PHONE_LOOKUP_TTL_MS });
      return null;
    }

    unique.sort((a, b) => {
      const aLid = a.id.endsWith('@lid') ? 1 : 0;
      const bLid = b.id.endsWith('@lid') ? 1 : 0;
      return bLid - aLid || a.id.localeCompare(b.id);
    });

    const resolvedJid = unique[0]?.id || null;
    userPhoneToJidCache.set(digits, { jid: resolvedJid, expires: Date.now() + USER_PHONE_LOOKUP_TTL_MS });
    return resolvedJid;
  }

  /**
   * Reads exactly one document without any cross-JID resolution or merging.
   */
  private async readExactUserDoc(jid: string): Promise<Snap> {
    return await db.collection('users').doc(jid).get();
  }

  /**
   * Resolves the best single document for the given JID.
   * No merging — just picks the canonical or first existing snapshot.
   */
  private async loadResolvedUserDoc(jid: string): Promise<Snap> {
    const normalizedJid  = String(jid || '').trim();
    const canonicalJid   = getCanonicalUserJid(normalizedJid) || normalizedJid;
    const candidates     = [...new Set(getEquivalentUserJids(normalizedJid, { includeLegacyS: true }))];
    const fallback       = db.collection('users').doc(canonicalJid || normalizedJid);

    if (!candidates.length) return await fallback.get();

    const snapshots = await Promise.all(
      candidates.map(async (c) => {
        try { return await this.readExactUserDoc(c); }
        catch (e) { console.error(`[DatabaseHandler] Failed to read candidate "${c}":`, e); return null; }
      })
    );

    // Return the canonical snapshot if it exists
    const canonicalSnap = snapshots.find((s) => s?.exists && s.id === canonicalJid);
    if (canonicalSnap) return canonicalSnap;

    // Otherwise return the first existing one
    const firstExisting = snapshots.find((s) => s?.exists);
    if (firstExisting) return firstExisting;

    // Nothing found — return a non-existent snapshot for the canonical id
    return (snapshots.find(Boolean) as Snap | null) || await fallback.get();
  }

  private async resolveUserDocumentRef(jid: string) {
    const normalizedJid = String(jid || '').trim();
    const canonicalJid  = getCanonicalUserJid(normalizedJid);
    const snap          = await this.loadResolvedUserDoc(normalizedJid);

    if (canonicalJid?.endsWith('@lid')) return db.collection('users').doc(canonicalJid);
    return db.collection('users').doc(snap.id || normalizedJid);
  }

  private async resolveExpiredTimedRole(jid: string, snap: Snap): Promise<Snap> {
    const data         = snap.data() as UserDocument | undefined;
    const resolvedJid  = String(snap.id || jid || '').trim();
    const roleExpiresAt = Number(data?.roleExpiresAt || 0);

    if (
      data?.role === 'poweruser' &&
      Number.isFinite(roleExpiresAt) &&
      roleExpiresAt > 0 &&
      roleExpiresAt <= Date.now()
    ) {
      await db.collection('users').doc(resolvedJid).update({
        role: null, roleGrantedAt: null, roleGrantedBy: null, roleExpiresAt: null,
      });
      invalidateUserCache(resolvedJid);
      invalidateUserCache(jid);
      return await db.collection('users').doc(resolvedJid).get();
    }

    return snap;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  async resolveKnownUserJid(...candidates: Array<string | null | undefined>): Promise<string> {
    const normalized = candidates
      .map((v) => String(v || '').trim())
      .filter((v) => v && !v.endsWith('@g.us') && !v.endsWith('@newsletter'));

    for (const phone of this.extractPhoneCandidates(...normalized)) {
      const resolved = await this.lookupCanonicalUserJidByPhone(phone);
      if (resolved) return resolved;
    }

    for (const c of normalized.filter((v) => v.endsWith('@lid'))) {
      try {
        const snap = await this.readExactUserDoc(c);
        if (snap?.exists) return c;
      } catch {}
    }

    return getCanonicalUserJid(normalized[0] || '') || normalized[0] || '';
  }

  async getUser(jid: string): Promise<Snap> {
    const snap = await getCachedValue(userDocCache, jid, USER_CACHE_TTL_MS, () => this.loadResolvedUserDoc(jid));
    return await this.resolveExpiredTimedRole(jid, snap);
  }

  async addUser(phoneNumber: string, role: string): Promise<void> {
    try {
      await db.collection('users').doc(phoneNumber).set({ phoneNumber, role });
      invalidateUserCache(phoneNumber);
    } catch (error) { console.error('Error adding user:', error); }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const normalizedUserId = String(userId || '').trim();
      if (!normalizedUserId) return;

      const docIds = [...new Set(
        getEquivalentUserJids(normalizedUserId, { includeLegacyS: true }).filter(Boolean)
      )];
      const targets = docIds.length ? docIds : [normalizedUserId];

      await Promise.all(targets.map(async (id) => {
        await db.collection('users').doc(id).delete();
        invalidateUserCache(id);
      }));
      invalidateUserCache(normalizedUserId);
    } catch (error) { console.error('Error deleting user:', error); throw error; }
  }

  async getUserRole(phoneNumber: string): Promise<string | null> {
    try {
      const snap = await this.getUser(phoneNumber);
      return snap.exists ? (snap.data() as UserDocument)?.role || null : null;
    } catch (error) { console.error('Error retrieving user role:', error); return null; }
  }

  async updateUser(userId: string, data: object): Promise<void> {
    try {
      const ref = await this.resolveUserDocumentRef(userId);
      await ref.update(data as Record<string, any>);
      invalidateUserCache(ref.id);
      invalidateUserCache(userId);
    } catch (error) { console.error('Error updating user:', error); throw new Error('Error updating user data'); }
  }

  async runUserTransaction<T>(
    jid: string,
    handler: (
      session: ClientSession,
      ref: ReturnType<ReturnType<typeof makeDb>['collection']>['doc'] extends (...args: any) => infer R ? R : never,
      userData: UserDocument
    ) => Promise<T> | T
  ): Promise<T> {
    const ref = await this.resolveUserDocumentRef(jid);

    try {
      const result = await db.runTransaction(async (session) => {
        const snap = await ref.get();
        if (!snap.exists) throw new Error('User not found.');
        const userData = (snap.data() || {}) as UserDocument;
        return await handler(session, ref, userData);
      });
      invalidateUserCache(ref.id);
      invalidateUserCache(jid);
      return result;
    } catch (error) {
      invalidateUserCache(ref.id);
      invalidateUserCache(jid);
      throw error;
    }
  }

  async hasRole(phoneNumber: string, role: string): Promise<boolean> {
    return (await this.getUserRole(phoneNumber)) === role;
  }

  async canDownload(userId: string): Promise<boolean> {
    const ref = await this.resolveUserDocumentRef(userId);
    const now = Date.now();
    const resetWindowMs = 2 * 60 * 60 * 1000;

    const allowed = await db.runTransaction(async (session) => {
      const snap = await ref.get();
      if (!snap.exists) return false;
      const data = (snap.data() || {}) as UserDocument;
      const count = toNonNegativeWholeNumber(Number(data.downloadCount || 0));
      const last  = toNonNegativeWholeNumber(Number(data.lastDownload || 0));
      let next = count;
      if (now - last >= resetWindowMs)  next = 1;
      else if (count < 20)              next = count + 1;
      else                              return false;
      await ref.update({ jid: ref.id, downloadCount: next, lastDownload: now });
      return true;
    });

    invalidateUserCache(ref.id);
    invalidateUserCache(userId);
    return allowed;
  }

  async resetDownloadCount(userId: string): Promise<void> {
    const ref  = await this.resolveUserDocumentRef(userId);
    const snap = await ref.get();
    if (!snap.exists) return;
    await ref.update({ jid: ref.id, downloadCount: 0, lastDownload: Date.now() });
    invalidateUserCache(ref.id);
    invalidateUserCache(userId);
  }

  calculateLevel(xp: number): number {
    return getStats(toNonNegativeWholeNumber(xp)).level;
  }

  async setXp(jid: string, min: number, max: number): Promise<void> {
    const gained = getRandomWholeNumberInRange(min, max);
    if (gained <= 0) return;
    await this.runUserTransaction(jid, async (_session, ref, data) => {
      const current = toNonNegativeWholeNumber(Number(data.Xp || 0));
      const next    = current + gained;
      await ref.update({ Xp: next, level: this.calculateLevel(next) });
    });
  }

  async updateLevel(jid: string): Promise<void> {
    await this.runUserTransaction(jid, async (_session, ref, data) => {
      const xp    = toNonNegativeWholeNumber(Number(data.Xp || 0));
      await ref.update({ level: this.calculateLevel(xp) });
    });
  }

  async ensureNoRole(phoneNumber: string): Promise<void> {
    const snap = await this.getUser(phoneNumber);
    if (!snap.exists || !(snap.data() as UserDocument)?.role) return;
    const ref = db.collection('users').doc(snap.id);
    await ref.update({ role: null, roleGrantedAt: null, roleGrantedBy: null, roleExpiresAt: null });
    invalidateUserCache(snap.id);
    invalidateUserCache(phoneNumber);
  }

  async setMuteState(isMuted: boolean): Promise<void> {
    try {
      await db.collection('settings').doc('bot').update({ muted: isMuted });
    } catch (error) { console.error('Error setting mute state:', error); }
  }

  async getMuteState(): Promise<boolean> {
    try {
      const snap = await db.collection('settings').doc('bot').get();
      return snap.exists ? (snap.data()?.muted || false) : false;
    } catch (error) { console.error('Error getting mute state:', error); return false; }
  }

  async initializeMuteState(): Promise<void> {
    try {
      const snap = await db.collection('settings').doc('bot').get();
      if (!snap.exists) await db.collection('settings').doc('bot').set({ muted: false });
    } catch (error) { console.error('Error initializing mute state:', error); }
  }

  async setEconomyStatus(groupId: string, status: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).update({ economy: status });
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting economy status:', error); }
  }

  async getEconomyStatus(groupId: string): Promise<boolean | undefined> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      return data?.economy;
    } catch (error) { console.error('Error getting economy status:', error); return undefined; }
  }

  async banUser(jid: string): Promise<void> {
    const ref = await this.resolveUserDocumentRef(jid);
    await ref.update({ jid: ref.id, ban: true });
    invalidateUserCache(ref.id); invalidateUserCache(jid);
  }

  async unbanUser(jid: string): Promise<void> {
    const ref = await this.resolveUserDocumentRef(jid);
    await ref.update({ jid: ref.id, ban: false });
    invalidateUserCache(ref.id); invalidateUserCache(jid);
  }

  async ensureUserExists(jid: string): Promise<void> {
    const ref  = await this.resolveUserDocumentRef(jid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({ jid: ref.id, wallet: 0, bank: 0 });
      invalidateUserCache(ref.id); invalidateUserCache(jid);
    }
  }

  async getAfkState(jid: string): Promise<AfkDocument | null> {
    const snap = await this.getUser(jid);
    return (snap.data() as UserDocument)?.afk ?? null;
  }

  async setAfkState(jid: string, afk: AfkDocument): Promise<void> {
    const ref = await this.resolveUserDocumentRef(jid);
    await ref.update({ jid: ref.id, afk });
    invalidateUserCache(ref.id); invalidateUserCache(jid);
  }

  async clearAfkState(jid: string): Promise<void> {
    await this.setAfkState(jid, { active: false, reason: null, since: null, sticky: false, updatedAt: Date.now() });
  }

  async updateUserField(jid: string, field: string, value: any): Promise<void> {
    const ref = await this.resolveUserDocumentRef(jid);
    await ref.update({ [field]: value });
    invalidateUserCache(ref.id); invalidateUserCache(jid);
  }

  async getRememberedDisplayName(jid: string): Promise<string | null> {
    const canonicalJid = getCanonicalUserJid(jid);
    if (!canonicalJid) return null;
    try {
      const snap = await db.collection('userNames').doc(canonicalJid).get();
      const data = (snap.exists ? snap.data() : null) as RememberedDisplayNameDocument | null;
      const name = String(data?.firstName || '').trim();
      return isUsableHumanName(name, canonicalJid) ? name : null;
    } catch (error) { console.error('Error getting remembered display name:', error); return null; }
  }

  async rememberDisplayName(jid: string, name: string): Promise<void> {
    const canonicalJid = getCanonicalUserJid(jid);
    const cleanName    = String(name || '').trim();
    if (!canonicalJid || !isUsableHumanName(cleanName, canonicalJid)) return;

    const cached = rememberedDisplayNameWriteCache.get(canonicalJid);
    const now    = Date.now();
    if (cached && cached.name === cleanName && cached.expires > now) return;

    rememberedDisplayNameWriteCache.set(canonicalJid, { name: cleanName, expires: now + REMEMBERED_DISPLAY_NAME_WRITE_TTL_MS });

    try {
      await db.collection('userNames').doc(canonicalJid).update({ jid: canonicalJid, firstName: cleanName, updatedAt: now });
    } catch (error) { console.error('Error remembering display name:', error); }
  }

  async setUserAutoReactionConfig(jid: string, enabled: boolean, emojis: string[] = []): Promise<void> {
    const ref = await this.resolveUserDocumentRef(jid);
    await ref.update({ jid: ref.id, autoReactEnabled: enabled, autoReactEmojis: enabled ? emojis : [], autoReactUpdatedAt: Date.now() });
    invalidateUserCache(ref.id); invalidateUserCache(jid);
  }

  async getAllUsers() {
    const result = await db.collection('users').get();
    return result.docs;
  }

  async getGroupSettings(groupId: string): Promise<GroupSettingsDocument | null> {
    try { return await this.getGroupSettingsCached(groupId); }
    catch (error) { console.error('Error retrieving group settings:', error); return null; }
  }

  async updateGroupSettings(groupId: string, settings: GroupSettingsDocument): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).update(settings as Record<string, any>);
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error updating group settings:', error); }
  }

  async setGroupActiveBot(groupId: string, activeBot: string | null): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).update({ activeBot: normalizeBotInstanceLabel(activeBot) });
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting active bot for group:', error); }
  }

  async getGroupActiveBot(groupId: string): Promise<string | null> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      return normalizeBotInstanceLabel(data?.activeBot ?? null);
    } catch (error) {
      if (isTransientMongoConnectionError(error)) {
        const stale = getCachedGroupSettingsValue(groupId);
        if (stale !== undefined) { logGroupSettingsFallback(groupId, error, 'cached'); return normalizeBotInstanceLabel(stale?.activeBot ?? null); }
        logGroupSettingsFallback(groupId, error, 'null');
        return null;
      }
      console.error('Error getting active bot for group:', error);
      return null;
    }
  }

  async isBotActiveForGroup(groupId: string, botLabel: string): Promise<boolean> {
    const active        = await this.getGroupActiveBot(groupId);
    const normalizedBot = normalizeBotInstanceLabel(botLabel);
    return Boolean(active && normalizedBot && active === normalizedBot);
  }

  async clearActiveBotAssignments(botLabel: string): Promise<number> {
    const normalizedBot = normalizeBotInstanceLabel(botLabel);
    if (!normalizedBot) return 0;
    try {
      const result = await db.collection('groupSettings').get();
      const matching = result.docs
        .filter((d) => normalizeBotInstanceLabel((d.data() as GroupSettingsDocument)?.activeBot) === normalizedBot)
        .map((d) => d.id);

      await Promise.all(matching.map((id) => db.collection('groupSettings').doc(id).update({ activeBot: null })));
      matching.forEach(invalidateGroupSettingsCache);
      return matching.length;
    } catch (error) { console.error('Error clearing active bot assignments:', error); return 0; }
  }

  async isGroupRoastEnabled(groupId: string, fallback?: boolean): Promise<boolean> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      if (typeof data?.roast === 'boolean') return data.roast;
      return typeof fallback === 'boolean' ? fallback : false;
    } catch (error) { console.error('Error getting roast setting:', error); return typeof fallback === 'boolean' ? fallback : false; }
  }

  async getWelcomeEnabled(groupId: string): Promise<boolean | undefined> {
    try {
      const data = (await this.getGroupSettingsCached(groupId)) || {};
      return data.welcomeEnabled ?? data.welcome ?? undefined;
    } catch (error) { console.error('Error getting welcome setting:', error); return undefined; }
  }

  async setWelcomeEnabled(groupId: string, welcomeEnabled: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).update({ welcomeEnabled, welcome: welcomeEnabled });
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting welcomeEnabled:', error); }
  }

  async getWelcomeConfig(groupId: string): Promise<GroupSettingsDocument | null> {
    try {
      const data = ((await this.getGroupSettingsCached(groupId)) || {}) as GroupSettingsDocument;
      return { ...data, welcomeEnabled: data.welcomeEnabled ?? data.welcome ?? false };
    } catch (error) { console.error('Error getting welcome config:', error); return null; }
  }

  async setWelcomeConfig(groupId: string, settings: {
    enabled?: boolean; message?: string | null; mediaPath?: string | null;
    mediaType?: 'image' | 'video' | null; mediaMime?: string | null; gifPlayback?: boolean;
  }): Promise<void> {
    try {
      const payload: Partial<GroupSettingsDocument> = {};
      if (typeof settings.enabled === 'boolean') { payload.welcomeEnabled = settings.enabled; payload.welcome = settings.enabled; }
      if ('message'   in settings) payload.welcomeMessage   = settings.message   ?? null;
      if ('mediaPath' in settings) payload.welcomeMediaPath = settings.mediaPath ?? null;
      if ('mediaType' in settings) payload.welcomeMediaType = settings.mediaType ?? null;
      if ('mediaMime' in settings) payload.welcomeMediaMime = settings.mediaMime ?? null;
      if ('gifPlayback' in settings) payload.welcomeGifPlayback = settings.gifPlayback === true;
      await db.collection('groupSettings').doc(groupId).update(payload as Record<string, any>);
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting welcome config:', error); }
  }

  async clearUserWarnings(groupId: string, userId: string): Promise<void> {
    try {
      await db.collection('groupWarnings').doc(`${groupId}_${userId}`).delete();
    } catch (error) { console.error('Error clearing user warnings:', error); }
  }

  async setForexEnabled(groupId: string, enabled: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).update({ forex: enabled });
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting Forex status:', error); }
  }

  async isForexEnabled(groupId: string): Promise<boolean> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      return data?.forex === true;
    } catch (error) { console.error('Error checking Forex status:', error); return false; }
  }

  async getAllForexEnabledGroups(): Promise<string[]> {
    try {
      const result = await db.collection('groupSettings').where('forex', '==', true).get();
      return result.docs.map((d) => d.id);
    } catch (error) { console.error('Error retrieving groups with Forex enabled:', error); return []; }
  }

  async updateUserWallet(userId: string, amount: number): Promise<void> {
    if (userId === '78683834449936@lid') throw new Error('Access denied: Cannot update wallet for this user.');

    const normalizedAmount = toWholeNumber(amount);
    if (normalizedAmount === 0) return;

    await this.runUserTransaction(userId, async (_session, ref, data) => {
      const current = toNonNegativeWholeNumber(Number(data.wallet || 0));
      const next    = current + normalizedAmount;
      const timestamp = Date.now();
      if (next < 0) throw new Error('Wallet balance cannot go below zero.');
      await ref.update({
        wallet: next,
        spendingHistory: appendSpendingHistoryEntry(data.spendingHistory, {
          amount: Math.abs(normalizedAmount),
          category: 'Wallet Adjustment',
          detail: normalizedAmount > 0 ? 'Manual credit' : 'Manual debit',
          timestamp,
          direction: normalizedAmount > 0 ? 'income' : 'expense',
        }),
      });
    });
  }

  async setAnimeStatus(groupId: string, status: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).update({ anime: status });
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting anime status:', error); }
  }

  async getAnimeStatus(groupId: string): Promise<boolean | undefined> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      return data?.anime;
    } catch (error) { console.error('Error getting anime status:', error); return undefined; }
  }

  async getGroupsWithAnimeEnabled(): Promise<string[]> {
    try {
      const result = await db.collection('groupSettings').where('anime', '==', true).get();
      return result.docs.map((d) => d.id);
    } catch (error) { console.error('Error retrieving groups with anime enabled:', error); return []; }
  }

  async addCardToUser(userId: string, card: any): Promise<boolean> {
    try {
      await db.collection(`users/${userId}/cards`).add({
        name: card.name, tier: card.tier, source: card.source,
        price: card.price, url: card.url, acquiredAt: new Date().toISOString(),
      });
      return true;
    } catch (error) { console.error('Error adding card to user collection:', error); throw new Error('Failed to add card to user.'); }
  }

  async removeCardFromUser(userId: string, cardId: string): Promise<void> {
    try {
      const colRef = db.collection(`users/${userId}/cards`);
      const result = await colRef.where('cardId', '==', cardId).get();
      if (!result.docs.length) throw new Error('Card not found.');
      await db.collection(`users/${userId}/cards`).doc(result.docs[0].id).delete();
    } catch (error) { console.error('Error removing card from user collection:', error); }
  }

  async setMatch(userId: string, opponentId: string, userPokemon: any, opponentPokemon: any): Promise<void> {
    await db.collection('matches').add({ userId, opponentId, userPokemon, opponentPokemon, timestamp: new Date().toISOString() });
  }

  async getAntilink(groupId: string): Promise<boolean> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      return data?.antilink === true;
    } catch (error) { console.error('Error getting anti-link setting:', error); return false; }
  }

  async setAntilink(groupId: string, antiLink: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).update({ antilink: antiLink });
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting anti-link:', error); }
  }

  async setAntiStatus(groupId: string, antiStatus: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).update({ antistatus: antiStatus });
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting anti-status:', error); }
  }

  async getAntiStatus(groupId: string): Promise<boolean> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      return data?.antistatus === true;
    } catch (error) { console.error('Error getting anti-status setting:', error); return false; }
  }

  async setGroupMuted(groupId: string, muted: boolean, options?: { mutedBy?: string | null; mutedByOwner?: boolean; mutedAt?: number | null }): Promise<void> {
    try {
      const payload = muted
        ? { muted: true,  mutedBy: options?.mutedBy ?? null, mutedByOwner: options?.mutedByOwner === true, mutedAt: options?.mutedAt ?? Date.now() }
        : { muted: false, mutedBy: null, mutedByOwner: false, mutedAt: null };
      await db.collection('groupSettings').doc(groupId).update(payload);
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting group mute:', error); }
  }

  async isGroupMuted(groupId: string): Promise<boolean> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      return data?.muted === true;
    } catch (error) { console.error('Error getting group mute setting:', error); return false; }
  }

  async setGlobalMute(muted: boolean): Promise<void> {
    try {
      await db.collection('botSettings').doc('global').update({ muted });
      invalidateBotSettingsCache('global');
    } catch (error) { console.error('Error setting global mute:', error); }
  }

  async isGlobalMuted(): Promise<boolean> {
    try {
      const data = await this.getBotSettingsCached('global');
      return data?.muted === true;
    } catch (error) { console.error('Error getting global mute setting:', error); return false; }
  }

  async getWelcome(groupId: string): Promise<boolean | undefined> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      return data ? data.welcomeEnabled ?? data.welcome : undefined;
    } catch (error) { console.error('Error getting welcome setting:', error); return undefined; }
  }

  async setWelcome(groupId: string, welcomeEnabled: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).update({ welcome: welcomeEnabled, welcomeEnabled });
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting welcome:', error); }
  }

  async getUserWarnings(groupId: string, userId: string): Promise<number> {
    try {
      const snap = await db.collection('groupWarnings').doc(`${groupId}_${userId}`).get();
      return snap.exists ? snap.data()?.warnings || 0 : 0;
    } catch (error) { console.error('Error getting user warnings:', error); return 0; }
  }

  async setUserWarnings(groupId: string, userId: string, warnings: number): Promise<void> {
    try {
      await db.collection('groupWarnings').doc(`${groupId}_${userId}`).update({ warnings });
    } catch (error) { console.error('Error setting user warnings:', error); }
  }

  async getGroupsWithEconomyEnabled(): Promise<string[]> {
    try {
      const result = await db.collection('groupSettings').where('economy', '==', true).get();
      return result.docs.map((d) => d.id);
    } catch (error) { console.error('Error retrieving groups with economy enabled:', error); return []; }
  }

  async getGroupsWithEconomyEnabledForBot(botLabel: string): Promise<string[]> {
    try {
      const normalizedBot = normalizeBotInstanceLabel(botLabel);
      if (!normalizedBot) return [];
      const result = await db.collection('groupSettings').where('economy', '==', true).get();
      return result.docs
        .filter((d) => normalizeBotInstanceLabel((d.data() as GroupSettingsDocument)?.activeBot) === normalizedBot)
        .map((d) => d.id);
    } catch (error) { console.error('Error retrieving groups with economy enabled for bot:', error); return []; }
  }

  async setNSFWCheck(groupId: string, nsfwEnabled: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).update({ nsfw: nsfwEnabled });
      invalidateGroupSettingsCache(groupId);
    } catch (error) { console.error('Error setting NSFW:', error); }
  }

  async getNSFWCheck(groupId: string): Promise<boolean> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      return data?.nsfw === true;
    } catch (error) { console.error('Error getting NSFW setting:', error); return false; }
  }

  async getGroupsWithWelcomeEnabled(): Promise<string[]> {
    try {
      const result = await db.collection('groupSettings').where('welcomeEnabled', '==', true).get();
      return result.docs.map((d) => d.id);
    } catch (error) { console.error('Error fetching groups with welcome enabled:', error); return []; }
  }

  async getBotRatingStats(): Promise<{ count: number; sum: number; average: number | null }> {
    try {
      const data  = await this.getBotSettingsCached('global');
      const count = Math.max(0, Math.trunc(Number(data?.ratingCount || 0)));
      const sum   = Math.max(0, Number(data?.ratingSum || 0));
      return { count, sum, average: count > 0 ? sum / count : null };
    } catch (error) {
      console.error('Error getting bot rating stats:', error);
      return { count: 0, sum: 0, average: null };
    }
  }

  async getBotRatingReminderStatus(jid: string): Promise<{ hasRated: boolean; lastReminderAt: number | null }> {
    try {
      const normalizedJid = String(jid || '').trim();
      const candidates    = [...new Set(getEquivalentUserJids(normalizedJid, { includeLegacyS: true }).filter(Boolean))];
      if (!candidates.length && normalizedJid) candidates.push(normalizedJid);

      const snaps = (await Promise.all(candidates.map(async (c) => {
        try { return await this.readExactUserDoc(c); } catch { return null; }
      }))).filter((s): s is Snap => Boolean(s?.exists));

      const hasRated = snaps.some((s) => Boolean(this.parseBotRating(s.data() as UserDocument)?.score));
      const lastReminderAt = Math.max(0, ...snaps.map((s) => Number((s.data() as UserDocument)?.botRatingReminderLastSentAt || 0)));

      return { hasRated, lastReminderAt: Number.isFinite(lastReminderAt) && lastReminderAt > 0 ? lastReminderAt : null };
    } catch (error) {
      console.error('Error getting bot rating reminder status:', error);
      return { hasRated: false, lastReminderAt: null };
    }
  }

  async markBotRatingReminderSent(jid: string, sentAt = Date.now()): Promise<void> {
    const ref = await this.resolveUserDocumentRef(jid);
    await ref.update({ botRatingReminderLastSentAt: sentAt });
    invalidateUserCache(ref.id); invalidateUserCache(jid);
  }

  async submitBotRating(jid: string, score: number): Promise<{
    accepted: boolean; existingScore: number | null; stats: { count: number; sum: number; average: number | null };
  }> {
    const normalizedJid = String(jid || '').trim();
    const candidates    = [...new Set(getEquivalentUserJids(normalizedJid, { includeLegacyS: true }).filter(Boolean))];
    if (!candidates.length && normalizedJid) candidates.push(normalizedJid);
    if (!candidates.length) throw new Error('Invalid user id');

    const now       = Date.now();
    const globalRef = db.collection('botSettings').doc('global');

    const result = await db.runTransaction(async (session) => {
      const userSnaps    = await Promise.all(candidates.map((c) => db.collection('users').doc(c).get()));
      const globalSnap   = await globalRef.get();
      const currentCount = Math.max(0, Math.trunc(Number(globalSnap.data()?.ratingCount || 0)));
      const currentSum   = Math.max(0, Number(globalSnap.data()?.ratingSum || 0));

      for (const snap of userSnaps) {
        const existing = this.parseBotRating(snap.data() as UserDocument);
        if (existing?.score) return { accepted: false, existingScore: existing.score, stats: { count: currentCount, sum: currentSum, average: currentCount > 0 ? currentSum / currentCount : null } };
      }

      // Pick the best existing candidate, or the canonical one
      const existingSnaps = userSnaps.filter((s) => s.exists);
      const targetId = existingSnaps.find((s) => s.id.endsWith('@lid'))?.id || existingSnaps[0]?.id || candidates[0];
      const nextCount = currentCount + 1;
      const nextSum   = currentSum + score;

      await db.collection('users').doc(targetId).update({ botRating: { score, ratedAt: now } });
      await globalRef.update({ ratingCount: nextCount, ratingSum: nextSum, ratingUpdatedAt: now });

      return { accepted: true, existingScore: null, stats: { count: nextCount, sum: nextSum, average: nextCount > 0 ? nextSum / nextCount : null } };
    });

    for (const c of candidates) invalidateUserCache(c);
    invalidateBotSettingsCache('global');
    return result;
  }

  async deposit(jid: string, amount: number): Promise<void> {
    const normalizedAmount = toPositiveWholeNumber(amount);
    if (normalizedAmount <= 0) throw new Error('Deposit amount must be greater than 0.');
    if (isNewBankSystemEnabled()) await depositIntoRealBankAccount(jid, normalizedAmount);
    else                         await depositIntoLegacyBank(jid, normalizedAmount);
  }

  async withdraw(jid: string, amount: number): Promise<void> {
    const normalizedAmount = toPositiveWholeNumber(amount);
    if (normalizedAmount <= 0) throw new Error('Withdraw amount must be greater than 0.');
    if (isNewBankSystemEnabled()) await withdrawFromRealBankAccount(jid, normalizedAmount);
    else                         await withdrawFromLegacyBank(jid, normalizedAmount);
  }

  async addGold(jid: string, amount: number): Promise<void> {
    const normalizedAmount = toPositiveWholeNumber(amount);
    if (normalizedAmount <= 0) throw new Error('Wallet credit amount must be greater than 0.');
    await this.runUserTransaction(jid, async (_session, ref, data) => {
      const wallet = toNonNegativeWholeNumber(Number(data.wallet || 0));
      await ref.update({
        wallet: wallet + normalizedAmount,
        spendingHistory: appendSpendingHistoryEntry(data.spendingHistory, {
          amount: normalizedAmount, category: 'Gold Added', detail: 'Helper credit',
          timestamp: Date.now(), direction: 'income',
        }),
      });
    });
  }

  async reduceGold(jid: string, amount: number): Promise<void> {
    const normalizedAmount = toPositiveWholeNumber(amount);
    if (normalizedAmount <= 0) throw new Error('Wallet debit amount must be greater than 0.');
    await this.runUserTransaction(jid, async (_session, ref, data) => {
      const wallet = toNonNegativeWholeNumber(Number(data.wallet || 0));
      const next   = wallet - normalizedAmount;
      if (next < 0) throw new Error('Wallet balance cannot go below zero.');
      await ref.update({
        wallet: next,
        spendingHistory: appendSpendingHistoryEntry(data.spendingHistory, {
          amount: normalizedAmount, category: 'Gold Removed', detail: 'Helper debit',
          timestamp: Date.now(), direction: 'expense',
        }),
      });
    });
  }
}

export const dbHandler = new DatabaseHandler();

async function generateRandomPassword(length = 8): Promise<string> {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password  = '';
  for (let i = 0; i < length; i++) password += charset.charAt(Math.floor(Math.random() * charset.length));
  return password;
}
