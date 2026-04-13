
import * as admin from 'firebase-admin';  // Firebase Admin SDK
import { Ctx } from "../lib/ctx";
import path from 'path';
import { installHybridFirestore, setHybridFirestoreWriteObserver } from './hybridFirestore';
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

// MongoDB is used as the primary database.
// Ensure db-primary-settings.json contains: { "primary": "mongodb" }
// (This is already the default in dbPrimarySettings.ts)
const serviceAccount = require(path.join(process.cwd(), 'sui.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'bnhh-dd880.appspot.com',
  });
}


// Shared context object to store the current Ctx
let currentCtx: Ctx | null = null;

// Function to set the global context
export function setGlobalCtx(ctx: Ctx) {
    currentCtx = ctx;
}

const rawFirestore = admin.firestore();
export const primaryFirestore = rawFirestore;
export const db: any = installHybridFirestore(admin as any, rawFirestore as any);

function getUserDocumentBankBalance(data?: any): number {
  if (!data || typeof data !== "object") {
    return 0;
  }

  return getTotalUserBankBalance(data);
}


// Define types for Firestore documents
interface Move {
  name: string;     // Name of the move (e.g., "Thunderbolt")
  power: number;    // Power of the move (e.g., 90)
  type: string;     // Type of the move (e.g., "Electric")
}

interface Ability {
  ability: { name: string; url: string };
  is_hidden: boolean;
}

interface IPokemon {
  id: number;
  abilities: { ability: { name: string; url: string }; is_hidden: boolean }[];
  base_experience: number;
  height: number;
  weight: number;
  sprites: {
    front_default: string;
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: { type: { name: string } }[];
}

interface CaughtPokemon {
  pokemonId: number;
  name: string;
  level: number;
  timestamp: string;
  hp: number;
  abilities: { ability: { name: string; url: string }; is_hidden: boolean }[];
  moves: { move: { name: string; url: string } }[];
  sprites: {
    front_default: string;
    other: {
      'official-artwork': { front_default: string };
    };
  };
  
  // Add missing properties to CaughtPokemon
  id: number;
  base_experience: number;
  height: number;
  weight: number;
  types: { type: { name: string; url: string } }[];

}


interface BlackMarketBoost {
  time: number;
  multiplier: number;
}

interface AfkDocument {
  active: boolean;
  reason: string | null;
  since: number | null;
  sticky?: boolean;
  updatedAt?: number;
}

interface MarriageDocument {
  spouseId?: string | null;
  marriedAt?: number | null;
}

interface PendingMarriageDocument {
  direction?: "incoming" | "outgoing";
  userId?: string | null;
  createdAt?: number | null;
}

interface BotRatingDocument {
  score?: number;
  ratedAt?: number;
}

interface SpendingHistoryEntry {
  amount: number;
  category: string;
  detail?: string;
  timestamp: number;
  direction?: "income" | "expense" | "transfer";
}

interface UserDocument {
  firstName?: string;
  username?: string;
  password?: string;
  actingAs?: string;
  actingAsSetAt?: number;
  originalNum?: string;
  originalNumSetAt?: number;
  phone?: string;
  phoneNumber?: string;
  role?: string | null;
  roleGrantedAt?: number | null;
  roleGrantedBy?: string | null;
  roleExpiresAt?: number | null;
  jid?: string;
  whatsappJid?: string;
  wallet?: number;
  gamble?: number;
  bank?: number;
  bankAccounts?: Array<{
    bankId: string;
    accountNumber: string;
    balance: number;
    openedAt: number;
    nextFeeAt: number;
    unpaidFees: number;
    status: "active" | "suspended";
    lastFeePaidAt?: number | null;
  }>;
  Xp?: number;
  bio?: string;
  lastBioUpdateAt?: number;
  lastCommandAt?: number;
  lastCommandDayKey?: string;
  level?: number;
  ban?: boolean;
  downloadCount?: number;
  lastDownload?: number;
  caughtPokemons?: CaughtPokemon[];
  lastDaily?: number;
  lastRob?: number;
  rouletteCooldown?: number;
  slotCooldown?: number;
  lastGambleExecutionId?: string;
  claimedCards?: ClaimedCard[];
  profilePicture?: string;
  black_market?: { boost: BlackMarketBoost };
  usernameChanges?: number;
  lastUsernameChange?: number;
  crime?: number;
  items?: { [key: string]: number };
  activeEffects?: { [key: string]: number };
  activeEffectExpiry?: { [key: string]: number };
  storePurchases?: { [key: string]: number };
  storePriceDayKey?: string;
  storePriceCounts?: { [key: string]: number };
  spendingHistory?: SpendingHistoryEntry[];
  jailedUntil?: number;
  bailAmount?: number;
  work?: number;
  beg?: { cooldown: string };
  banned?: boolean;
  bannedReason?: string | null;
  bannedBy?: string | null;
  bannedAt?: number | null;
  unbannedAt?: number | null;
  callWarningCount?: number;
  lastCallAt?: number | null;
  callBlockedAt?: number | null;
  loan?: { amount: number; due: number; paid: boolean; tamount: number };
  afk?: AfkDocument;
  marriage?: MarriageDocument;
  pendingMarriage?: PendingMarriageDocument;
  streak?: {
    consecutiveDays?: number;
    lastCommandDayKey?: string | null;
    lastLostStreak?: number;
    restoreUses?: number;
    restoreMonthKey?: string | null;
  };
  wrapped?: {
    lastSentWeekKey?: string;
    lastSentAt?: number;
  };

  // NEW: store song plays for Wrapped
  plays?: {
    title: string;
    artist: string;
    url: string;
    thumbnail?: string | null;
    timestamp: number;
  }[];
  autoReactEnabled?: boolean;
  autoReactEmojis?: string[];
  autoReactUpdatedAt?: number;
  botRating?: BotRatingDocument;
  botRatingReminderLastSentAt?: number;
  pendingHaigusha?: PendingHaigushaDocument;
  marriedHaigusha?: MarriedHaigushaDocument;
}



// Define your interface for a claimed card
interface ClaimedCard {
  cardId: string;
  title: string;
  tier: string;
  price: number;
  url: string;
  timestamp: admin.firestore.Timestamp;  // This should be Timestamp, not FieldValue
}

interface GroupSettingsDocument {
  economy?: boolean;
  activeBot?: string | null;
  latestHaigusha?: PendingHaigushaDocument;
  antilink?: boolean;
  antistatus?: boolean;
  anime?: boolean;
  forex?: boolean;
  nsfw?: boolean;
  roast?: boolean;
  antispam?: {
    enabled?: boolean;
    maxMessages?: number;
    windowSeconds?: number;
    duplicateThreshold?: number;
    cooldownSeconds?: number;
    action?: "warn" | "kick";
  };
  muted?: boolean;
  mutedBy?: string | null;
  mutedByOwner?: boolean;
  mutedAt?: number | null;
  welcome?: boolean;
  welcomeEnabled?: boolean; // The field for enabling/disabling welcome messages
  welcomeMessage?: string | null;
  welcomeMediaPath?: string | null;
  welcomeMediaType?: "image" | "video" | null;
  welcomeMediaMime?: string | null;
  welcomeGifPlayback?: boolean;
}

interface RememberedDisplayNameDocument {
  jid?: string;
  firstName?: string;
  updatedAt?: number;
}

const USER_CACHE_TTL_MS = Number(process.env.BNH_USER_CACHE_TTL_MS || 5_000);
const GROUP_SETTINGS_CACHE_TTL_MS = Number(process.env.BNH_GROUP_SETTINGS_CACHE_TTL_MS || 1_000);
const BOT_SETTINGS_CACHE_TTL_MS = Number(process.env.BNH_BOT_SETTINGS_CACHE_TTL_MS || 1_000);
const GROUP_SETTINGS_ERROR_LOG_COOLDOWN_MS = Number(
  process.env.BNH_GROUP_SETTINGS_ERROR_LOG_COOLDOWN_MS || 60_000
);
const REMEMBERED_DISPLAY_NAME_WRITE_TTL_MS = Number(
  process.env.BNH_REMEMBERED_DISPLAY_NAME_WRITE_TTL_MS || 10 * 60 * 1000
);

const userDocCache = new Map<string, { value: FirebaseFirestore.DocumentSnapshot<UserDocument>; expires: number }>();
const groupSettingsCache = new Map<string, { value: GroupSettingsDocument | null; expires: number }>();
const botSettingsCache = new Map<string, { value: FirebaseFirestore.DocumentData | null; expires: number }>();
const pendingCacheLoads = new WeakMap<object, Map<string, Promise<unknown>>>();
const groupSettingsErrorCooldown = new Map<string, number>();
const rememberedDisplayNameWriteCache = new Map<string, { name: string; expires: number }>();
const userPhoneToJidCache = new Map<string, { jid: string | null; expires: number }>();
const USER_PHONE_LOOKUP_TTL_MS = Number(process.env.BNH_USER_PHONE_LOOKUP_TTL_MS || 5 * 60 * 1000);

function getPendingCacheMap<T>(
  cache: Map<string, { value: T; expires: number }>
): Map<string, Promise<T>> {
  const cacheKey = cache as unknown as object;
  let pending = pendingCacheLoads.get(cacheKey);

  if (!pending) {
    pending = new Map<string, Promise<unknown>>();
    pendingCacheLoads.set(cacheKey, pending);
  }

  return pending as Map<string, Promise<T>>;
}

async function getCachedValue<T>(
  cache: Map<string, { value: T; expires: number }>,
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const useCache = Number.isFinite(ttlMs) && ttlMs > 0;

  if (useCache) {
    const cached = cache.get(key);
    if (cached && cached.expires > now) {
      return cached.value;
    }
  }

  const pending = getPendingCacheMap(cache);
  const existingLoad = pending.get(key);
  if (existingLoad) {
    return existingLoad;
  }

  const loadPromise = loader()
    .then((value) => {
      if (useCache) {
        cache.set(key, { value, expires: Date.now() + ttlMs });
      } else {
        cache.delete(key);
      }
      return value;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, loadPromise);
  return loadPromise;
}

function invalidateUserCache(jid?: string | null) {
  if (!jid) return;
  const cacheKeys = new Set<string>([
    String(jid),
    ...getEquivalentUserJids(jid, { includeLegacyS: true }),
  ]);
  for (const cacheKey of cacheKeys) {
    userDocCache.delete(cacheKey);
  }
}

function invalidateUserPhoneLookupCache(phone?: string | null): void {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  if (!digits) return;
  userPhoneToJidCache.delete(digits);
}

export function invalidateUserDocumentCache(jid?: string | null): void {
  invalidateUserCache(jid);
}

function invalidateGroupSettingsCache(groupId?: string | null) {
  if (!groupId) return;
  groupSettingsCache.delete(groupId);
}

function getCachedGroupSettingsValue(groupId?: string | null): GroupSettingsDocument | null | undefined {
  if (!groupId) return undefined;
  const cached = groupSettingsCache.get(groupId);
  return cached ? cached.value : undefined;
}

function invalidateBotSettingsCache(docId?: string | null) {
  if (!docId) return;
  botSettingsCache.delete(docId);
}

function invalidateCachesForPath(path?: string | null): void {
  const parts = String(path || "").split("/").filter(Boolean);
  if (parts.length < 2) {
    return;
  }

  const [collectionName, docId] = parts;

  if (collectionName === "users") {
    invalidateUserCache(docId);
    return;
  }

  if (collectionName === "groupSettings") {
    invalidateGroupSettingsCache(docId);
    return;
  }

  if (collectionName === "botSettings") {
    invalidateBotSettingsCache(docId);
  }
}

function normalizeBotInstanceLabel(value?: string | null): string | null {
  return normalizeBotInstanceName(value) || null;
}

function toWholeNumber(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function toNonNegativeWholeNumber(value: number): number {
  return Math.max(0, toWholeNumber(value));
}

function toPositiveWholeNumber(value: number): number {
  return Math.max(0, toWholeNumber(value));
}

function getRandomWholeNumberInRange(min: number, max: number): number {
  const safeMin = toNonNegativeWholeNumber(min);
  const safeMax = Math.max(safeMin, toNonNegativeWholeNumber(max));
  return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
}

function isTransientMongoConnectionError(error: unknown): boolean {
  const candidates = [error, (error as any)?.cause].filter(Boolean);

  return candidates.some((candidate: any) => {
    const name = String(candidate?.name || "");
    const code = String(candidate?.code || "");
    const message = String(candidate?.message || "");
    const labels = Array.isArray(candidate?.errorLabelSet)
      ? candidate.errorLabelSet.map((label: unknown) => String(label))
      : candidate?.errorLabelSet instanceof Set
        ? [...candidate.errorLabelSet].map((label: unknown) => String(label))
        : [];

    return (
      code === "ECONNRESET" ||
      /ECONNRESET/i.test(message) ||
      /PoolClearedError/i.test(name) ||
      /MongoNetworkError/i.test(name) ||
      /connection pool .* cleared/i.test(message) ||
      labels.some((label: string) => /ResetPool|PoolRequstedRetry|PoolRequestedRetry/i.test(label))
    );
  });
}

function summarizeError(error: unknown): string {
  const name = String((error as any)?.name || "Error");
  const code = String((error as any)?.code || (error as any)?.cause?.code || "").trim();
  const message = String((error as any)?.message || (error as any)?.cause?.message || error || "").trim();

  return [name, code ? `(${code})` : "", message].filter(Boolean).join(" ");
}

function logGroupSettingsFallback(groupId: string, error: unknown, mode: "cached" | "null"): void {
  const key = `${mode}:${groupId}`;
  const now = Date.now();
  const nextAllowedAt = groupSettingsErrorCooldown.get(key) || 0;
  if (nextAllowedAt > now) {
    return;
  }

  groupSettingsErrorCooldown.set(key, now + GROUP_SETTINGS_ERROR_LOG_COOLDOWN_MS);

  const summary = summarizeError(error);
  if (mode === "cached") {
    console.warn(
      `[DatabaseHandler] Using stale cached group settings for ${groupId} after transient Mongo error: ${summary}`
    );
    return;
  }

  console.warn(
    `[DatabaseHandler] Active bot lookup returned null for ${groupId} after transient Mongo error: ${summary}`
  );
}

setHybridFirestoreWriteObserver((operations) => {
  for (const operation of operations) {
    invalidateCachesForPath(operation.path);
  }
});
// Database update functions
export class DatabaseHandler {
  private scoreUserSnapshotData(data?: UserDocument | null): number {
    if (!data || typeof data !== "object") {
      return -1;
    }

    let score = 0;

    if (String(data.password || "").trim()) score += 1_000_000;
    if (String(data.phone || data.phoneNumber || "").trim()) score += 50_000;
    if (String(data.username || "").trim()) score += 10_000;
    if (String(data.firstName || "").trim()) score += 5_000;
    if (Array.isArray((data as any).caughtPokemons) && (data as any).caughtPokemons.length > 0) score += 1_000;
    if (Array.isArray((data as any).party) && (data as any).party.length > 0) score += 1_000;
    if (Array.isArray((data as any).claimedCards) && (data as any).claimedCards.length > 0) score += 500;
    if (Array.isArray((data as any).marriages) && (data as any).marriages.length > 0) score += 250;
    if (Number(data.wallet || 0) !== 0) score += 250;
    if (getUserDocumentBankBalance(data) !== 0) score += 250;

    score += Object.keys(data as Record<string, unknown>).length;
    return score;
  }

  private async readExactUserDoc(
    jid: string
  ): Promise<FirebaseFirestore.DocumentSnapshot<UserDocument>> {
    if (typeof db.getDocument === "function") {
      return await db.getDocument(`users/${jid}`, { exact: true });
    }

    return await db.collection("users").doc(jid).get();
  }

  private async loadResolvedUserDoc(
    jid: string
  ): Promise<FirebaseFirestore.DocumentSnapshot<UserDocument>> {
    const normalizedJid = String(jid || "").trim();
    const canonicalJid = getCanonicalUserJid(normalizedJid) || normalizedJid;
    const canonicalUserPart = getJidUserPart(canonicalJid);
    const fallbackRef = db.collection("users").doc(canonicalJid || normalizedJid);
    const candidates = [...new Set(getEquivalentUserJids(normalizedJid, { includeLegacyS: true }))];

    if (!candidates.length) {
      return await fallbackRef.get();
    }

    const snapshots = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          return await this.readExactUserDoc(candidate);
        } catch (error) {
          console.error(`[DatabaseHandler] Failed to read candidate user doc "${candidate}":`, error);
          return null;
        }
      })
    );

    const existingSnapshots = snapshots.filter(
      (snapshot): snapshot is FirebaseFirestore.DocumentSnapshot<UserDocument> => Boolean(snapshot?.exists)
    );

    if (!existingSnapshots.length) {
      return (snapshots.find(Boolean) as FirebaseFirestore.DocumentSnapshot<UserDocument> | null) || await fallbackRef.get();
    }

    const sameUserPartSnapshots = canonicalUserPart
      ? existingSnapshots.filter((snapshot) => getJidUserPart(snapshot.id) === canonicalUserPart)
      : existingSnapshots;
    const safeSnapshots = sameUserPartSnapshots.length ? sameUserPartSnapshots : existingSnapshots;

    // Return the canonical doc if it exists, otherwise pick the highest-scored one.
    // No cross-document merging is performed.
    const canonicalSnapshot = safeSnapshots.find((snapshot) => snapshot.id === canonicalJid);
    if (canonicalSnapshot?.exists) {
      return canonicalSnapshot;
    }

    const sorted = [...safeSnapshots].sort((left, right) => {
      const scoreDifference =
        this.scoreUserSnapshotData(right.data() as UserDocument | undefined) -
        this.scoreUserSnapshotData(left.data() as UserDocument | undefined);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return candidates.indexOf(left.id) - candidates.indexOf(right.id);
    });

    return sorted[0];
  }

  private async resolveUserDocumentRef(
    jid: string
  ): Promise<FirebaseFirestore.DocumentReference<UserDocument>> {
    const normalizedJid = String(jid || "").trim();
    const canonicalJid = getCanonicalUserJid(normalizedJid);
    const resolvedSnapshot = await this.loadResolvedUserDoc(normalizedJid);

    if (canonicalJid && canonicalJid.endsWith("@lid")) {
      return db.collection("users").doc(canonicalJid) as FirebaseFirestore.DocumentReference<UserDocument>;
    }

    return (resolvedSnapshot.ref || db.collection("users").doc(normalizedJid)) as FirebaseFirestore.DocumentReference<UserDocument>;
  }

  private async resolveExpiredTimedRole(
    jid: string,
    userDoc: FirebaseFirestore.DocumentSnapshot<UserDocument>
  ): Promise<FirebaseFirestore.DocumentSnapshot<UserDocument>> {
    const userData = userDoc.data();
    const resolvedJid = String(userDoc.ref?.id || jid || "").trim();
    const roleExpiresAt = Number(userData?.roleExpiresAt || 0);

    if (
      userData?.role === "poweruser" &&
      Number.isFinite(roleExpiresAt) &&
      roleExpiresAt > 0 &&
      roleExpiresAt <= Date.now()
    ) {
      await db.collection("users").doc(resolvedJid).set(
        {
          role: null,
          roleGrantedAt: null,
          roleGrantedBy: null,
          roleExpiresAt: null,
        },
        { merge: true }
      );
      invalidateUserCache(resolvedJid);
      invalidateUserCache(jid);
      return await db.collection("users").doc(resolvedJid).get();
    }

    return userDoc;
  }

  private pickPreferredUserRef(
    candidates: string[],
    snapshots: FirebaseFirestore.DocumentSnapshot<UserDocument>[]
  ): FirebaseFirestore.DocumentReference<UserDocument> {
    const canonicalCandidate = candidates.find((candidate) => candidate.endsWith("@lid"));
    const existingSnapshots = snapshots.filter(
      (snapshot): snapshot is FirebaseFirestore.DocumentSnapshot<UserDocument> =>
        Boolean(snapshot?.exists)
    );

    if (existingSnapshots.length) {
      const canonicalSnapshot = canonicalCandidate
        ? existingSnapshots.find((snapshot) => snapshot.id === canonicalCandidate)
        : null;
      if (canonicalSnapshot) {
        return canonicalSnapshot.ref as FirebaseFirestore.DocumentReference<UserDocument>;
      }

      existingSnapshots.sort((left, right) => {
        const scoreDifference =
          this.scoreUserSnapshotData(right.data() as UserDocument | undefined) -
          this.scoreUserSnapshotData(left.data() as UserDocument | undefined);

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        return candidates.indexOf(left.id) - candidates.indexOf(right.id);
      });

      return existingSnapshots[0].ref as FirebaseFirestore.DocumentReference<UserDocument>;
    }

    const fallbackId = String(canonicalCandidate || candidates[0] || "").trim();
    return db.collection("users").doc(fallbackId) as FirebaseFirestore.DocumentReference<UserDocument>;
  }

  private parseBotRating(data?: UserDocument | null): BotRatingDocument | null {
    if (!data || typeof data !== "object") {
      return null;
    }

    const score = Number(data.botRating?.score || 0);
    if (!Number.isFinite(score) || score < 1 || score > 10) {
      return null;
    }

    const ratedAt = Number(data.botRating?.ratedAt || 0);
    return {
      score,
      ratedAt: Number.isFinite(ratedAt) && ratedAt > 0 ? ratedAt : undefined,
    };
  }

  private async getGroupSettingsCached(groupId: string): Promise<GroupSettingsDocument | null> {
    try {
      return await getCachedValue(groupSettingsCache, groupId, GROUP_SETTINGS_CACHE_TTL_MS, async () => {
        const groupDoc = await db.collection('groupSettings').doc(groupId).get();
        return groupDoc.exists ? (groupDoc.data() as GroupSettingsDocument) : null;
      });
    } catch (error) {
      if (isTransientMongoConnectionError(error)) {
        const staleCached = getCachedGroupSettingsValue(groupId);
        if (staleCached !== undefined) {
          logGroupSettingsFallback(groupId, error, "cached");
          return staleCached;
        }
      }

      throw error;
    }
  }

  private async getBotSettingsCached(docId: string): Promise<FirebaseFirestore.DocumentData | null> {
    return getCachedValue(botSettingsCache, docId, BOT_SETTINGS_CACHE_TTL_MS, async () => {
      const settingsDoc = await db.collection('botSettings').doc(docId).get();
      return settingsDoc.exists ? settingsDoc.data() ?? null : null;
    });
  }

  private extractPhoneCandidates(...candidates: Array<string | null | undefined>): string[] {
    return [...new Set(
      candidates
        .map((value) => getJidUserPart(value))
        .map((value) => String(value || "").replace(/[^\d]/g, ""))
        .filter((value) => value.length >= 8)
    )];
  }

  private async lookupCanonicalUserJidByPhone(phone: string): Promise<string | null> {
    const digits = String(phone || "").replace(/[^\d]/g, "");
    if (!digits) return null;

    const cached = userPhoneToJidCache.get(digits);
    if (cached && cached.expires > Date.now()) {
      return cached.jid;
    }

    const queryFields: Array<"phone" | "phoneNumber" | "whatsappJid"> = ["phone", "phoneNumber", "whatsappJid"];
    const matchedSnapshots: FirebaseFirestore.DocumentSnapshot<UserDocument>[] = [];

    for (const field of queryFields) {
      try {
        const snapshot = await db.collection("users").where(field, "==", digits).get();
        matchedSnapshots.push(...snapshot.docs as Array<FirebaseFirestore.DocumentSnapshot<UserDocument>>);
      } catch {}

      if (field === "whatsappJid") {
        continue;
      }

      try {
        const jidValue = `${digits}@s.whatsapp.net`;
        const snapshot = await db.collection("users").where(field, "==", jidValue).get();
        matchedSnapshots.push(...snapshot.docs as Array<FirebaseFirestore.DocumentSnapshot<UserDocument>>);
      } catch {}
    }

    if (!matchedSnapshots.length) {
      userPhoneToJidCache.set(digits, { jid: null, expires: Date.now() + USER_PHONE_LOOKUP_TTL_MS });
      return null;
    }

    const uniqueMatches = [...new Map(
      matchedSnapshots
        .filter((snapshot) => snapshot?.exists)
        .map((snapshot) => [snapshot.id, snapshot])
    ).values()];

    const distinctLidIds = [...new Set(
      uniqueMatches
        .map((snapshot) => String(snapshot.id || "").trim())
        .filter((docId) => docId.endsWith("@lid"))
    )];

    if (distinctLidIds.length > 1) {
      console.warn(
        `[DatabaseHandler] Refusing ambiguous phone lookup for ${digits}; multiple @lid docs match: ${distinctLidIds.join(", ")}`
      );
      userPhoneToJidCache.set(digits, {
        jid: null,
        expires: Date.now() + USER_PHONE_LOOKUP_TTL_MS,
      });
      return null;
    }

    uniqueMatches.sort((left, right) => {
      const scoreDifference =
        this.scoreUserSnapshotData(right.data() as UserDocument | undefined) -
        this.scoreUserSnapshotData(left.data() as UserDocument | undefined);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const leftLid = left.id.endsWith("@lid") ? 1 : 0;
      const rightLid = right.id.endsWith("@lid") ? 1 : 0;
      if (leftLid !== rightLid) {
        return rightLid - leftLid;
      }

      return left.id.localeCompare(right.id);
    });

    const resolvedJid = uniqueMatches[0]?.id || null;
    userPhoneToJidCache.set(digits, {
      jid: resolvedJid,
      expires: Date.now() + USER_PHONE_LOOKUP_TTL_MS,
    });
    return resolvedJid;
  }

  async resolveKnownUserJid(...candidates: Array<string | null | undefined>): Promise<string> {
    const normalizedCandidates = candidates
      .map((value) => String(value || "").trim())
      .filter((value) => value && !value.endsWith("@g.us") && !value.endsWith("@newsletter"));

    const phoneCandidates = this.extractPhoneCandidates(...normalizedCandidates);
    for (const phone of phoneCandidates) {
      const resolvedFromPhone = await this.lookupCanonicalUserJidByPhone(phone);
      if (resolvedFromPhone) {
        return resolvedFromPhone;
      }
    }

    const lidCandidates = normalizedCandidates.filter((value) => value.endsWith("@lid"));
    for (const candidate of lidCandidates) {
      try {
        const exact = await this.readExactUserDoc(candidate);
        if (exact?.exists) {
          return candidate;
        }
      } catch {}
    }

    return getCanonicalUserJid(normalizedCandidates[0] || "") || normalizedCandidates[0] || "";
  }

  async addUser(phoneNumber: string, role: string): Promise<void> {
    try {
      await db.collection('users').doc(phoneNumber).set({
        phoneNumber,
        role
      }, { merge: true });
      invalidateUserCache(phoneNumber);
    } catch (error) {
      console.error('Error adding user:', error);
    }
  }


  async deleteUser(userId:string) {
    try {
      const normalizedUserId = String(userId || "").trim();
      if (!normalizedUserId) {
        return;
      }

      const docIds = [...new Set(
        getEquivalentUserJids(normalizedUserId, { includeLegacyS: true }).filter(Boolean)
      )];
      const deleteTargets = docIds.length ? docIds : [normalizedUserId];

      await Promise.all(
        deleteTargets.map(async (docId) => {
          await db.collection('users').doc(docId).delete();
          invalidateUserCache(docId);
        })
      );
      invalidateUserCache(normalizedUserId);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async getUserRole(phoneNumber: string): Promise<string | null> {
    try {
      const userDoc = await this.getUser(phoneNumber);
      return userDoc.exists ? userDoc.data()?.role || null : null;
    } catch (error) {
      console.error('Error retrieving user role:', error);
      return null;
    }
  }
  async updateUser(userId: string, data: object) {
    try {
      const userRef = await this.resolveUserDocumentRef(userId);
      await userRef.update(data);
      invalidateUserCache(userRef.id);
      invalidateUserCache(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Error updating user data');
    }
  }  // Inside DatabaseHandler class

  // Method to get group settings
  async getGroupSettings(groupId: string): Promise<GroupSettingsDocument | null> {
    try {
      return await this.getGroupSettingsCached(groupId);
    } catch (error) {
      console.error('Error retrieving group settings:', error);
      return null;
    }
  }

  async isGroupRoastEnabled(groupId: string, fallback?: boolean): Promise<boolean> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      if (typeof data?.roast === "boolean") {
        return data.roast;
      }
      return typeof fallback === "boolean" ? fallback : false;
    } catch (error) {
      console.error('Error getting roast setting for group:', error);
      return typeof fallback === "boolean" ? fallback : false;
    }
  }

 async getWelcomeEnabled(groupId: string): Promise<boolean | undefined> {
    try {
      const data = (await this.getGroupSettingsCached(groupId)) || {};
      if (!data) return undefined;
      return data.welcomeEnabled ?? data.welcome ?? undefined;
    } catch (error) {
      console.error('Error getting welcome setting:', error);
      return undefined;
    }
  }
  

  async setWelcomeEnabled(groupId: string, welcomeEnabled: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set(
        { welcomeEnabled, welcome: welcomeEnabled }, 
        { merge: true }  // This ensures we don't overwrite other settings in the document
      );
      invalidateGroupSettingsCache(groupId);
    } catch (error) {
      console.error('Error setting welcomeEnabled:', error);
    }
  }

  async getWelcomeConfig(groupId: string): Promise<GroupSettingsDocument | null> {
    try {
      const data = ((await this.getGroupSettingsCached(groupId)) || {}) as GroupSettingsDocument;
      return {
        ...data,
        welcomeEnabled: data.welcomeEnabled ?? data.welcome ?? false,
      };
    } catch (error) {
      console.error('Error getting welcome config:', error);
      return null;
    }
  }

  async setWelcomeConfig(groupId: string, settings: {
    enabled?: boolean;
    message?: string | null;
    mediaPath?: string | null;
    mediaType?: "image" | "video" | null;
    mediaMime?: string | null;
    gifPlayback?: boolean;
  }): Promise<void> {
    try {
      const payload: GroupSettingsDocument = {};

      if (typeof settings.enabled === 'boolean') {
        payload.welcomeEnabled = settings.enabled;
        payload.welcome = settings.enabled;
      }
      if ('message' in settings) payload.welcomeMessage = settings.message ?? null;
      if ('mediaPath' in settings) payload.welcomeMediaPath = settings.mediaPath ?? null;
      if ('mediaType' in settings) payload.welcomeMediaType = settings.mediaType ?? null;
      if ('mediaMime' in settings) payload.welcomeMediaMime = settings.mediaMime ?? null;
      if ('gifPlayback' in settings) payload.welcomeGifPlayback = settings.gifPlayback === true;

      await db.collection('groupSettings').doc(groupId).set(payload, { merge: true });
      invalidateGroupSettingsCache(groupId);
    } catch (error) {
      console.error('Error setting welcome config:', error);
    }
  }
  
 // Consolidated methods for setting and getting Forex status
async clearUserWarnings(groupId: string, userId: string): Promise<void> {
  try {
    await db.collection("groupWarnings").doc(`${groupId}_${userId}`).delete();
    console.log(`Cleared warnings for ${userId} in ${groupId}.`);
  } catch (error) {
    console.error("Error clearing user warnings:", error);
  }
}

// Set Forex status (enabled or disabled)
async setForexEnabled(groupId: string, enabled: boolean): Promise<void> {
  try {
    await db.collection('groupSettings').doc(groupId).set({
      forex: enabled
    }, { merge: true });
    invalidateGroupSettingsCache(groupId);
    console.log(`Forex status for group ${groupId} set to: ${enabled}`);
  } catch (error) {
    console.error('Error setting Forex status:', error);
  }
}
 // Restrict wallet updates for a specific user
 async updateUserWallet(userId: string, amount: number): Promise<void> {
  if (userId === "78683834449936@lid") {//wtf did i.do🤣🤣
    throw new Error("Access denied: Cannot update wallet for this user.");
  }

  try {
    const normalizedAmount = toWholeNumber(amount);
    if (normalizedAmount === 0) return;

    await this.runUserTransaction(userId, async (transaction, userRef, userData) => {
      const currentWallet = toNonNegativeWholeNumber(Number(userData.wallet || 0));
      const nextWallet = currentWallet + normalizedAmount;
      const timestamp = Date.now();

      if (nextWallet < 0) {
        throw new Error("Wallet balance cannot go below zero.");
      }

      transaction.set(userRef, {
        wallet: nextWallet,
        spendingHistory: appendSpendingHistoryEntry(userData.spendingHistory, {
          amount: Math.abs(normalizedAmount),
          category: "Wallet Adjustment",
          detail: normalizedAmount > 0 ? "Manual credit" : "Manual debit",
          timestamp,
          direction: normalizedAmount > 0 ? "income" : "expense",
        }),
      }, { merge: true });
    });
    console.log(`Wallet updated for user ${userId} by ${normalizedAmount}.`);
  } catch (error) {
    console.error('Error updating wallet:', error);
    throw error;
  }
}


// Get Forex status (true or false)
async isForexEnabled(groupId: string): Promise<boolean> {
  try {
    const groupSettingsDoc = await this.getGroupSettingsCached(groupId);
    return groupSettingsDoc?.forex === true;
  } catch (error) {
    console.error('Error checking Forex status:', error);
    return false; // Default to false if there's an error
  }
}

// Get all groups with Forex enabled
async getAllForexEnabledGroups(): Promise<string[]> {
  try {
    const snapshot = await db.collection('groupSettings').where('forex', '==', true).get();
    return snapshot.docs.map((doc: any) => doc.id); // Returns group IDs with Forex enabled
  } catch (error) {
    console.error('Error retrieving groups with Forex enabled:', error);
    return [];
  }
}


  // Method to update group settings
  async updateGroupSettings(groupId: string, settings: GroupSettingsDocument): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set(settings, { merge: true });
      invalidateGroupSettingsCache(groupId);
    } catch (error) {
      console.error('Error updating group settings:', error);
    }
  }

  async setGroupActiveBot(groupId: string, activeBot: string | null): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set({
        activeBot: normalizeBotInstanceLabel(activeBot),
      }, { merge: true });
      invalidateGroupSettingsCache(groupId);
    } catch (error) {
      console.error('Error setting active bot for group:', error);
    }
  }

  async getGroupActiveBot(groupId: string): Promise<string | null> {
    try {
      const groupDoc = await this.getGroupSettingsCached(groupId);
      return normalizeBotInstanceLabel(groupDoc?.activeBot ?? null);
    } catch (error) {
      if (isTransientMongoConnectionError(error)) {
        const staleCached = getCachedGroupSettingsValue(groupId);
        if (staleCached !== undefined) {
          logGroupSettingsFallback(groupId, error, "cached");
          return normalizeBotInstanceLabel(staleCached?.activeBot ?? null);
        }

        logGroupSettingsFallback(groupId, error, "null");
        return null;
      }

      console.error('Error getting active bot for group:', error);
      return null;
    }
  }

  async isBotActiveForGroup(groupId: string, botLabel: string): Promise<boolean> {
    const activeBot = await this.getGroupActiveBot(groupId);
    const normalizedBot = normalizeBotInstanceLabel(botLabel);
    return Boolean(activeBot && normalizedBot && activeBot === normalizedBot);
  }

  async clearActiveBotAssignments(botLabel: string): Promise<number> {
    const normalizedBot = normalizeBotInstanceLabel(botLabel);
    if (!normalizedBot) {
      return 0;
    }

    try {
      const snapshot = await db.collection("groupSettings").get();
      const matchingGroupIds = snapshot.docs
        .filter((doc: any) => normalizeBotInstanceLabel(doc.data()?.activeBot) === normalizedBot)
        .map((doc: any) => String(doc.id));

      await Promise.all(
        matchingGroupIds.map((groupId: string) =>
          db.collection("groupSettings").doc(groupId).set(
            { activeBot: null },
            { merge: true }
          )
        )
      );

      for (const groupId of matchingGroupIds) {
        invalidateGroupSettingsCache(groupId);
      }

      return matchingGroupIds.length;
    } catch (error) {
      console.error("Error clearing active bot assignments:", error);
      return 0;
    }
  }


  async hasRole(phoneNumber: string, role: string): Promise<boolean> {
    const userRole = await this.getUserRole(phoneNumber);
    return userRole === role;
  }
   // Check if user can download, increment if allowed, and reset if time limit reached
   async canDownload(userId: string): Promise<boolean> {
    const userRef = await this.resolveUserDocumentRef(userId);
    const now = Date.now();
    const resetWindowMs = 2 * 60 * 60 * 1000;

    const allowed = await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        return false;
      }

      const userData = (userDoc.data() || {}) as UserDocument;
      const downloadCount = toNonNegativeWholeNumber(Number(userData.downloadCount || 0));
      const lastDownload = toNonNegativeWholeNumber(Number(userData.lastDownload || 0));

      let nextDownloadCount = downloadCount;

      if (now - lastDownload >= resetWindowMs) {
        nextDownloadCount = 1;
      } else if (downloadCount < 20) {
        nextDownloadCount = downloadCount + 1;
      } else {
        return false;
      }

      transaction.set(userRef, {
        jid: userRef.id,
        downloadCount: nextDownloadCount,
        lastDownload: now,
      }, { merge: true });

      return true;
    });

    invalidateUserCache(userRef.id);
    invalidateUserCache(userId);
    return allowed;
  }

  // Method to reset download count after 2 hours (optional but can be useful)
  async resetDownloadCount(userId: string): Promise<void> {
    const userRef = await this.resolveUserDocumentRef(userId);
    const now = Date.now();
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return;
    }

    await userRef.set({ jid: userRef.id, downloadCount: 0, lastDownload: now }, { merge: true });
    invalidateUserCache(userRef.id);
    invalidateUserCache(userId);
  }

  // Method to calculate level based on XP
  calculateLevel(xp: number): number {
    return getStats(toNonNegativeWholeNumber(xp)).level;
  }


  async setXp(jid: string, min: number, max: number): Promise<void> {
    const gainedXp = getRandomWholeNumberInRange(min, max);
    if (gainedXp <= 0) return;

    await this.runUserTransaction(jid, async (transaction, userRef, userData) => {
      const currentXp = toNonNegativeWholeNumber(Number(userData.Xp || 0));
      const nextXp = currentXp + gainedXp;

      transaction.set(userRef, {
        Xp: nextXp,
        level: this.calculateLevel(nextXp),
      }, { merge: true });
    });
  }


  // Method to update user level based on XP
  async updateLevel(jid: string): Promise<void> {
    await this.runUserTransaction(jid, async (transaction, userRef, userData) => {
      const xp = toNonNegativeWholeNumber(Number(userData.Xp || 0));
      const level = this.calculateLevel(xp);
      transaction.set(userRef, { level }, { merge: true });
    });
  }

  
  async ensureNoRole(phoneNumber: string): Promise<void> {
    const userDoc = await this.getUser(phoneNumber);
    if (!userDoc.exists || !userDoc.data()?.role) {
      return;
    }

    const userRef = userDoc.ref as FirebaseFirestore.DocumentReference<UserDocument>;
    await userRef.set({
      role: null,
      roleGrantedAt: null,
      roleGrantedBy: null,
      roleExpiresAt: null,
    }, { merge: true });
    invalidateUserCache(userRef.id);
    invalidateUserCache(phoneNumber);
  }
    // Set the mute state for the bot
    async setMuteState(isMuted: boolean): Promise<void> {
      try {
        await db.collection('settings').doc('bot').set({ muted: isMuted }, { merge: true });
        console.log(`Mute state updated to: ${isMuted}`);
      } catch (error) {
        console.error('Error setting mute state:', error);
      }
    }
  
    // Get the current mute state of the bot
    async getMuteState(): Promise<boolean> {
      try {
        const muteDoc = await db.collection('settings').doc('bot').get();
        return muteDoc.exists ? muteDoc.data()?.muted || false : false;
      } catch (error) {
        console.error('Error getting mute state:', error);
        return false; // Default to unmuted on error
      }
    }
  
    // Ensure the mute state document exists, initializing it if necessary
    async initializeMuteState(): Promise<void> {
      try {
        const muteDoc = await db.collection('settings').doc('bot').get();
        if (!muteDoc.exists) {
          await db.collection('settings').doc('bot').set({ muted: false });
          console.log('Mute state initialized to false.');
        }
      } catch (error) {
        console.error('Error initializing mute state:', error);
      }
    }
  
  
  async setEconomyStatus(groupId: string, status: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set({
        economy: status
      }, { merge: true });
      invalidateGroupSettingsCache(groupId);
    } catch (error) {
      console.error('Error setting economy status:', error);
    }
  }
  async removeCardFromUser(userId: string, cardId: string): Promise<void> {
    try {
      const userCollectionRef = db.collection('users').doc(userId).collection('cards');
      const snapshot = await userCollectionRef.where('cardId', '==', cardId).get();
  
      if (snapshot.empty) {
        throw new Error('Card not found.');
      }
  
      // Assuming the first document matches the card to be removed
      const cardDoc = snapshot.docs[0];
      await cardDoc.ref.delete();
      console.log(`Card ${cardId} removed from user ${userId}`);
    } catch (error) {
      console.error('Error removing card from user collection:', error);
    }
  }
  
  async getEconomyStatus(groupId: string): Promise<boolean | undefined> {
    try {
      const groupDoc = await this.getGroupSettingsCached(groupId);
      return groupDoc?.economy;
    } catch (error) {
      console.error('Error getting economy status:', error);
      return undefined;
    }
  }

  async banUser(jid: string): Promise<void> {
    const userRef = await this.resolveUserDocumentRef(jid);
    await userRef.set({ jid: userRef.id, ban: true }, { merge: true });
    invalidateUserCache(userRef.id);
    invalidateUserCache(jid);
  }

  async unbanUser(jid: string): Promise<void> {
    const userRef = await this.resolveUserDocumentRef(jid);
    await userRef.set({ jid: userRef.id, ban: false }, { merge: true });
    invalidateUserCache(userRef.id);
    invalidateUserCache(jid);
  }

  async ensureUserExists(jid: string): Promise<void> {
    const userRef = await this.resolveUserDocumentRef(jid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({ jid: userRef.id, wallet: 0, bank: 0 }, { merge: true });
      invalidateUserCache(userRef.id);
      invalidateUserCache(jid);
    }
  }

async getUser(jid: string): Promise<FirebaseFirestore.DocumentSnapshot<UserDocument>> {
  const userDoc = await getCachedValue(userDocCache, jid, USER_CACHE_TTL_MS, async () => {
    return await this.loadResolvedUserDoc(jid);
  });

  return await this.resolveExpiredTimedRole(jid, userDoc);
}

  async runUserTransaction<T>(
    jid: string,
    handler: (
      transaction: FirebaseFirestore.Transaction,
      userRef: FirebaseFirestore.DocumentReference<UserDocument>,
      userData: UserDocument
    ) => Promise<T> | T
  ): Promise<T> {
    const userRef = await this.resolveUserDocumentRef(jid);

    try {
      const result = await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error("User not found.");
        }

        const userData = (userDoc.data() || {}) as UserDocument;
        return await handler(transaction, userRef, userData);
      });

      invalidateUserCache(userRef.id);
      invalidateUserCache(jid);
      return result;
    } catch (error) {
      invalidateUserCache(userRef.id);
      invalidateUserCache(jid);
      throw error;
    }
  }

  async getAfkState(jid: string): Promise<AfkDocument | null> {
    const userDoc = await this.getUser(jid);
    return userDoc.data()?.afk ?? null;
  }

  async setAfkState(jid: string, afk: AfkDocument): Promise<void> {
    const userRef = await this.resolveUserDocumentRef(jid);
    await userRef.set({ jid: userRef.id, afk }, { merge: true });
    invalidateUserCache(userRef.id);
    invalidateUserCache(jid);
  }

  async clearAfkState(jid: string): Promise<void> {
    await this.setAfkState(jid, {
      active: false,
      reason: null,
      since: null,
      sticky: false,
      updatedAt: Date.now(),
    });
  }

  async updateUserField(jid: string, field: string, value: any): Promise<void> {
    const userRef = await this.resolveUserDocumentRef(jid);
    await userRef.update({ [field]: value });
    invalidateUserCache(userRef.id);
    invalidateUserCache(jid);
  }

  async getRememberedDisplayName(jid: string): Promise<string | null> {
    const canonicalJid = getCanonicalUserJid(jid);
    if (!canonicalJid) return null;

    try {
      const doc = await db.collection("userNames").doc(canonicalJid).get();
      const data = (doc.exists ? doc.data() : null) as RememberedDisplayNameDocument | null;
      const name = String(data?.firstName || "").trim();
      return isUsableHumanName(name, canonicalJid) ? name : null;
    } catch (error) {
      console.error("Error getting remembered display name:", error);
      return null;
    }
  }

  async rememberDisplayName(jid: string, name: string): Promise<void> {
    const canonicalJid = getCanonicalUserJid(jid);
    const cleanName = String(name || "").trim();
    if (!canonicalJid || !isUsableHumanName(cleanName, canonicalJid)) {
      return;
    }

    const cached = rememberedDisplayNameWriteCache.get(canonicalJid);
    const now = Date.now();
    if (cached && cached.name === cleanName && cached.expires > now) {
      return;
    }

    rememberedDisplayNameWriteCache.set(canonicalJid, {
      name: cleanName,
      expires: now + REMEMBERED_DISPLAY_NAME_WRITE_TTL_MS,
    });

    try {
      await db.collection("userNames").doc(canonicalJid).set(
        {
          jid: canonicalJid,
          firstName: cleanName,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error remembering display name:", error);
    }
  }

  async setUserAutoReactionConfig(jid: string, enabled: boolean, emojis: string[] = []): Promise<void> {
    const userRef = await this.resolveUserDocumentRef(jid);
    await userRef.set({
      jid: userRef.id,
      autoReactEnabled: enabled,
      autoReactEmojis: enabled ? emojis : [],
      autoReactUpdatedAt: Date.now(),
    }, { merge: true });
    invalidateUserCache(userRef.id);
    invalidateUserCache(jid);
  }


async getAllUsers() {
  const snapshot = await db.collection('users').get();
  return snapshot.docs;
}

  async getBotRatingStats(): Promise<{ count: number; sum: number; average: number | null }> {
    try {
      const globalDoc = await this.getBotSettingsCached('global');
      const count = Math.max(0, Math.trunc(Number(globalDoc?.ratingCount || 0) || 0));
      const sum = Math.max(0, Number(globalDoc?.ratingSum || 0) || 0);

      return {
        count,
        sum,
        average: count > 0 ? sum / count : null,
      };
    } catch (error) {
      console.error("Error getting bot rating stats:", error);
      return {
        count: 0,
        sum: 0,
        average: null,
      };
    }
  }

  async getBotRatingReminderStatus(jid: string): Promise<{
    hasRated: boolean;
    lastReminderAt: number | null;
  }> {
    try {
      const normalizedJid = String(jid || "").trim();
      const candidates = [...new Set(getEquivalentUserJids(normalizedJid, { includeLegacyS: true }).filter(Boolean))];
      if (!candidates.length && normalizedJid) {
        candidates.push(normalizedJid);
      }

      const userSnapshots = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            return await this.readExactUserDoc(candidate);
          } catch {
            return null;
          }
        })
      );

      const existingSnapshots = userSnapshots.filter(
        (snapshot): snapshot is FirebaseFirestore.DocumentSnapshot<UserDocument> => Boolean(snapshot?.exists)
      );

      const hasRated = existingSnapshots.some((snapshot) =>
        Boolean(this.parseBotRating(snapshot.data() as UserDocument | undefined)?.score)
      );
      const lastReminderAt = Math.max(
        0,
        ...existingSnapshots.map((snapshot) => Number(snapshot.data()?.botRatingReminderLastSentAt || 0))
      );

      return {
        hasRated,
        lastReminderAt: Number.isFinite(lastReminderAt) && lastReminderAt > 0
          ? lastReminderAt
          : null,
      };
    } catch (error) {
      console.error("Error getting bot rating reminder status:", error);
      return {
        hasRated: false,
        lastReminderAt: null,
      };
    }
  }

  async markBotRatingReminderSent(jid: string, sentAt = Date.now()): Promise<void> {
    const userRef = await this.resolveUserDocumentRef(jid);
    await userRef.set(
      {
        botRatingReminderLastSentAt: sentAt,
      },
      { merge: true }
    );
    invalidateUserCache(userRef.id);
    invalidateUserCache(jid);
  }

  async submitBotRating(
    jid: string,
    score: number
  ): Promise<{
    accepted: boolean;
    existingScore: number | null;
    stats: { count: number; sum: number; average: number | null };
  }> {
    const normalizedJid = String(jid || "").trim();
    const candidates = [...new Set(getEquivalentUserJids(normalizedJid, { includeLegacyS: true }).filter(Boolean))];
    if (!candidates.length && normalizedJid) {
      candidates.push(normalizedJid);
    }

    if (!candidates.length) {
      throw new Error("Invalid user id");
    }

    const now = Date.now();
    const userRefs = candidates.map(
      (candidate) => db.collection("users").doc(candidate) as FirebaseFirestore.DocumentReference<UserDocument>
    );
    const globalRef = db.collection("botSettings").doc("global");

    const result = await db.runTransaction(async (transaction: any) => {
      const userSnapshots = await Promise.all(
        userRefs.map((ref) => transaction.get(ref))
      );
      const globalSnapshot = await transaction.get(globalRef);

      const currentCount = Math.max(
        0,
        Math.trunc(Number(globalSnapshot.data()?.ratingCount || 0) || 0)
      );
      const currentSum = Math.max(0, Number(globalSnapshot.data()?.ratingSum || 0) || 0);

      for (const snapshot of userSnapshots) {
        const existingRating = this.parseBotRating(snapshot.data() as UserDocument | undefined);
        if (existingRating?.score) {
          return {
            accepted: false,
            existingScore: existingRating.score,
            stats: {
              count: currentCount,
              sum: currentSum,
              average: currentCount > 0 ? currentSum / currentCount : null,
            },
          };
        }
      }

      const targetRef = this.pickPreferredUserRef(candidates, userSnapshots);
      const nextCount = currentCount + 1;
      const nextSum = currentSum + score;

      transaction.set(
        targetRef,
        {
          botRating: {
            score,
            ratedAt: now,
          },
        },
        { merge: true }
      );
      transaction.set(
        globalRef,
        {
          ratingCount: nextCount,
          ratingSum: nextSum,
          ratingUpdatedAt: now,
        },
        { merge: true }
      );

      return {
        accepted: true,
        existingScore: null,
        stats: {
          count: nextCount,
          sum: nextSum,
          average: nextCount > 0 ? nextSum / nextCount : null,
        },
      };
    });

    for (const candidate of candidates) {
      invalidateUserCache(candidate);
    }
    invalidateBotSettingsCache("global");

    return result;
  }


  async deposit(jid: string, amount: number): Promise<void> {
    try {
      const normalizedAmount = toPositiveWholeNumber(amount);
      if (normalizedAmount <= 0) {
        throw new Error("Deposit amount must be greater than 0.");
      }
      if (isNewBankSystemEnabled()) {
        await depositIntoRealBankAccount(jid, normalizedAmount);
      } else {
        await depositIntoLegacyBank(jid, normalizedAmount);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async withdraw(jid: string, amount: number): Promise<void> {
    try {
      const normalizedAmount = toPositiveWholeNumber(amount);
      if (normalizedAmount <= 0) {
        throw new Error("Withdraw amount must be greater than 0.");
      }
      if (isNewBankSystemEnabled()) {
        await withdrawFromRealBankAccount(jid, normalizedAmount);
      } else {
        await withdrawFromLegacyBank(jid, normalizedAmount);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async addGold(jid: string, amount: number): Promise<void> {
    try {
      const normalizedAmount = toPositiveWholeNumber(amount);
      if (normalizedAmount <= 0) {
        throw new Error("Wallet credit amount must be greater than 0.");
      }

      await this.runUserTransaction(jid, async (transaction, userRef, userData) => {
        const wallet = toNonNegativeWholeNumber(Number(userData.wallet || 0));
        const nextWallet = wallet + normalizedAmount;
        transaction.update(userRef, {
          wallet: nextWallet,
          spendingHistory: appendSpendingHistoryEntry(userData.spendingHistory, {
            amount: normalizedAmount,
            category: "Gold Added",
            detail: "Helper credit",
            timestamp: Date.now(),
            direction: "income",
          }),
        });
      });
    } catch (error) {
      console.error('Error updating wallet:', error);
      throw error;
    }
  }

  async reduceGold(jid: string, amount: number): Promise<void> {
    try {
      const normalizedAmount = toPositiveWholeNumber(amount);
      if (normalizedAmount <= 0) {
        throw new Error("Wallet debit amount must be greater than 0.");
      }

      await this.runUserTransaction(jid, async (transaction, userRef, userData) => {
        const wallet = toNonNegativeWholeNumber(Number(userData.wallet || 0));
        const nextWallet = wallet - normalizedAmount;

        if (nextWallet < 0) {
          throw new Error("Wallet balance cannot go below zero.");
        }

        transaction.update(userRef, {
          wallet: nextWallet,
          spendingHistory: appendSpendingHistoryEntry(userData.spendingHistory, {
            amount: normalizedAmount,
            category: "Gold Removed",
            detail: "Helper debit",
            timestamp: Date.now(),
            direction: "expense",
          }),
        });
      });
    } catch (error) {
      console.error('Error updating wallet:', error);
      throw error;
    }
  }

async setAntilink(groupId: string, antiLink: boolean): Promise<void> {
  try {
    await db.collection('groupSettings').doc(groupId).set({ antilink: antiLink }, { merge: true });
    invalidateGroupSettingsCache(groupId);
  } catch (error) {
    console.error('Error setting anti-link:', error);
  }
}

async setAntiStatus(groupId: string, antiStatus: boolean): Promise<void> {
  try {
    await db.collection('groupSettings').doc(groupId).set({ antistatus: antiStatus }, { merge: true });
    invalidateGroupSettingsCache(groupId);
  } catch (error) {
    console.error('Error setting anti-status:', error);
  }
}

async getAntiStatus(groupId: string): Promise<boolean> {
  try {
    const groupDoc = await this.getGroupSettingsCached(groupId);
    return groupDoc?.antistatus === true;
  } catch (error) {
    console.error('Error getting anti-status setting:', error);
    return false;
  }
}

async setGroupMuted(
  groupId: string,
  muted: boolean,
  options?: { mutedBy?: string | null; mutedByOwner?: boolean; mutedAt?: number | null }
): Promise<void> {
  try {
    const payload = muted
      ? {
          muted: true,
          mutedBy: options?.mutedBy ?? null,
          mutedByOwner: options?.mutedByOwner === true,
          mutedAt: options?.mutedAt ?? Date.now(),
        }
      : {
          muted: false,
          mutedBy: null,
          mutedByOwner: false,
          mutedAt: null,
        };

    await db.collection('groupSettings').doc(groupId).set(payload, { merge: true });
    invalidateGroupSettingsCache(groupId);
  } catch (error) {
    console.error('Error setting group mute:', error);
  }
}

async isGroupMuted(groupId: string): Promise<boolean> {
  try {
    const groupDoc = await this.getGroupSettingsCached(groupId);
    return groupDoc?.muted === true;
  } catch (error) {
    console.error('Error getting group mute setting:', error);
    return false;
  }
}

async setGlobalMute(muted: boolean): Promise<void> {
  try {
    await db.collection('botSettings').doc('global').set({ muted }, { merge: true });
    invalidateBotSettingsCache('global');
  } catch (error) {
    console.error('Error setting global mute:', error);
  }
}

async isGlobalMuted(): Promise<boolean> {
  try {
    const globalDoc = await this.getBotSettingsCached('global');
    return globalDoc?.muted === true;
  } catch (error) {
    console.error('Error getting global mute setting:', error);
    return false;
  }
}
  
  async getWelcome(groupId: string): Promise<boolean | undefined> {
    try {
      const data = await this.getGroupSettingsCached(groupId);
      if (data) {
        return data.welcomeEnabled ?? data.welcome;
      } else {
        console.log(`No document found for group ${groupId}`);
        return undefined;
      }
    } catch (error) {
      console.error('Error getting welcome setting:', error);
      return undefined;
    }
  }
  
  
  async setWelcome(groupId: string, welcomeEnabled: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set({
        welcome: welcomeEnabled,
        welcomeEnabled,
      }, { merge: true });
      invalidateGroupSettingsCache(groupId);
      console.log(`Set welcome setting for group ${groupId} to ${welcomeEnabled}`);
    } catch (error) {
      console.error('Error setting welcome:', error);
    }
  }
  
  
  // Get the number of warnings for a user in a group
async getUserWarnings(groupId: string, userId: string): Promise<number> {
  try {
    const userWarningsRef = db.collection('groupWarnings').doc(`${groupId}_${userId}`);
    const userWarningsDoc = await userWarningsRef.get();

    if (!userWarningsDoc.exists) {
      return 0; // No warnings yet
    }

    return userWarningsDoc.data()?.warnings || 0;
  } catch (error) {
    console.error('Error getting user warnings:', error);
    return 0;
  }
}

// Set the warning count for a user
async setUserWarnings(groupId: string, userId: string, warnings: number): Promise<void> {
  try {
    await db.collection('groupWarnings').doc(`${groupId}_${userId}`).set({ warnings }, { merge: true });
    console.log(`Warning count for ${userId} in ${groupId} updated to: ${warnings}`);
  } catch (error) {
    console.error('Error setting user warnings:', error);
  }
}

async getGroupsWithEconomyEnabled(): Promise<string[]> {
  try {
      const snapshot = await db.collection('groupSettings').where('economy', '==', true).get();
      return snapshot.docs.map((doc: any) => doc.id); // Assuming the document ID is the group ID
  } catch (error) {
      console.error('Error retrieving groups with economy enabled:', error);
      return [];
  }
}

async getGroupsWithEconomyEnabledForBot(botLabel: string): Promise<string[]> {
  try {
      const normalizedBot = normalizeBotInstanceLabel(botLabel);
      if (!normalizedBot) return [];

      const snapshot = await db.collection('groupSettings').where('economy', '==', true).get();
      return snapshot.docs
        .filter((doc: any) => normalizeBotInstanceLabel(doc.data()?.activeBot) === normalizedBot)
        .map((doc: any) => doc.id);
  } catch (error) {
      console.error('Error retrieving groups with economy enabled for bot:', error);
      return [];
  }
}
async setAnimeStatus(groupId: string, status: boolean): Promise<void> {
  try {
    await db.collection('groupSettings').doc(groupId).set({
      anime: status
    }, { merge: true });
    invalidateGroupSettingsCache(groupId);
    console.log(`Anime status for group ${groupId} set to: ${status}`);
  } catch (error) {
    console.error('Error setting anime status:', error);
  }
}

// Method to get anime feature status for a group
async getAnimeStatus(groupId: string): Promise<boolean | undefined> {
  try {
    const groupDoc = await this.getGroupSettingsCached(groupId);
    return groupDoc?.anime;
  } catch (error) {
    console.error('Error getting anime status:', error);
    return undefined;
  }
}
async getGroupsWithAnimeEnabled(): Promise<string[]> {
  try {
      const snapshot = await db.collection('groupSettings').where('anime', '==', true).get();
      return snapshot.docs.map((doc: any) => doc.id); // Assuming the document ID is the group ID
  } catch (error) {
      console.error('Error retrieving groups with economy enabled:', error);
      return [];
  }
}

async addCardToUser(userId: string, card: any) {
  try {
      const userCollectionRef = db.collection('users').doc(userId).collection('cards');

      // Add card to the user's "cards" subcollection
      await userCollectionRef.add({
          name: card.name,
          tier: card.tier,
          source: card.source,
          price: card.price,
          url: card.url, // Assuming the card object has a URL or image
          acquiredAt: new Date().toISOString() // Timestamp when the card was acquired
      });

      console.log(`Card ${card.name} added to user ${userId}'s collection.`);
      return true;
  } catch (error) {
      console.error('Error adding card to user collection:', error);
      throw new Error('Failed to add card to user.');
  }
}

async setMatch(
  userId: string,
  opponentId: string,
  userPokemon: any,
  opponentPokemon: any
): Promise<void> {
  // Correct function body
  await db.collection('matches').add({
    userId,
    opponentId,
    userPokemon,
    opponentPokemon,
    timestamp: new Date().toISOString(),
  });
}

async getAntilink(groupId: string): Promise<boolean> {
  try {
    const groupDoc = await this.getGroupSettingsCached(groupId);
    return groupDoc?.antilink === true;
  } catch (error) {
    console.error('Error getting anti-link setting:', error);
    return false;
  }
}

  // Methods to save/get NSFW toggle setting from the database
  async setNSFWCheck(groupId: string, nsfwEnabled: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set({ nsfw: nsfwEnabled }, { merge: true });
      invalidateGroupSettingsCache(groupId);
      console.log(`Set NSFW check setting for group ${groupId} to ${nsfwEnabled}`);
    } catch (error) {
      console.error('Error setting NSFW:', error);
    }
  }
  
  async getNSFWCheck(groupId: string): Promise<boolean> {
    try {
      const groupDoc = await this.getGroupSettingsCached(groupId);
      return groupDoc?.nsfw === true;
    } catch (error) {
      console.error('Error getting NSFW setting:', error);
      return false; // Default to false if there's an error
    }
  }
  


// DatabaseHandler.ts
async getGroupsWithWelcomeEnabled(): Promise<string[]> {
  try {
    const groupsSnapshot = await db.collection('groupSettings')
      .where('welcomeEnabled', '==', true)
      .get();

    const groupIds: string[] = [];
    groupsSnapshot.forEach((doc: any) => {
      groupIds.push(doc.id);  // Add the group ID to the array
    });
    return groupIds;
  } catch (error) {
    console.error('Error fetching groups with welcome enabled:', error);
    return [];
  }
}
}

export const dbHandler = new DatabaseHandler();
// Function to generate a random password
async function generateRandomPassword(length = 8) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
