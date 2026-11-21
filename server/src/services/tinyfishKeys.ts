import { sqlite } from '../db';

/**
 * Per-user TinyFish API keys.
 * Each user connects their own TinyFish key at sign-up (or later); searches they start
 * run on their key. The key is stored server-side only and never returned in full.
 */
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS user_tinyfish_keys (
    user_id TEXT PRIMARY KEY,
    api_key TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )
`);

export function maskKey(key: string): string {
  if (!key) return '';
  const k = String(key);
  return k.length <= 10 ? '••••' : `${k.slice(0, 12)}…${k.slice(-4)}`;
}

export function saveUserTinyFishKey(userId: string, apiKey: string, verified: boolean): void {
  sqlite
    .prepare(`
      INSERT INTO user_tinyfish_keys (user_id, api_key, verified, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET api_key = excluded.api_key, verified = excluded.verified, updated_at = excluded.updated_at
    `)
    .run(userId, apiKey.trim(), verified ? 1 : 0, new Date().toISOString());
}

export function getUserTinyFishKey(userId: string | undefined | null): { apiKey: string; verified: boolean } | null {
  if (!userId) return null;
  const row = sqlite
    .prepare(`SELECT api_key, verified FROM user_tinyfish_keys WHERE user_id = ?`)
    .get(userId) as { api_key: string; verified: number } | undefined;
  return row ? { apiKey: row.api_key, verified: row.verified === 1 } : null;
}

export function getUserTinyFishStatus(userId: string) {
  const k = getUserTinyFishKey(userId);
  return k ? { connected: true, verified: k.verified, maskedKey: maskKey(k.apiKey) } : { connected: false, verified: false, maskedKey: null };
}

/**
 * Verifies a TinyFish key with the FREE Search API (no credits used).
 */
export async function verifyTinyFishKey(apiKey: string): Promise<{ ok: boolean; status: number; message: string; sample?: string[] }> {
  const key = String(apiKey || '').trim();
  if (!key) return { ok: false, status: 0, message: 'No key entered.' };
  try {
    const resp = await fetch('https://api.search.tinyfish.ai?query=' + encodeURIComponent('Maharashtra 7/12 land records mahabhumi'), {
      headers: { 'X-API-Key': key },
      signal: AbortSignal.timeout(15000)
    });
    if (resp.status === 401 || resp.status === 403) {
      return { ok: false, status: resp.status, message: 'TinyFish rejected this key. Check it on agent.tinyfish.ai/api-keys.' };
    }
    if (!resp.ok) {
      return { ok: false, status: resp.status, message: `TinyFish returned HTTP ${resp.status}.` };
    }
    const data: any = await resp.json().catch(() => ({}));
    const list: any[] = data.results || data.data || [];
    const sample = list.slice(0, 3).map((r: any) => r.title || r.url).filter(Boolean);
    return { ok: true, status: 200, message: 'TinyFish key verified.', sample };
  } catch (e: any) {
    return { ok: false, status: 0, message: `Could not reach TinyFish: ${e.message}` };
  }
}
