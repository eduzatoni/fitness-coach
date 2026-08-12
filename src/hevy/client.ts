import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://api.hevyapp.com/v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const projectRoot = fileURLToPath(new URL("../../..", import.meta.url));
const CACHE_DIR = join(projectRoot, "data", "cache");

function getApiKey(): string {
  const key = process.env["HEVY_API_KEY"];
  if (!key) {
    throw new Error(
      "HEVY_API_KEY is not set. Copy .env.example to .env and add your key."
    );
  }
  return key;
}

function cacheKey(path: string, query: Record<string, string | number> = {}): string {
  const raw = path + JSON.stringify(query);
  return createHash("sha1").update(raw).digest("hex");
}

function readCache<T>(key: string): T | null {
  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try {
    const { ts, data } = JSON.parse(readFileSync(file, "utf8")) as { ts: number; data: T };
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify({ ts: Date.now(), data }));
}

export async function hevyGet<T>(
  path: string,
  query: Record<string, string | number> = {},
  options: { refresh?: boolean } = {}
): Promise<T> {
  const ck = cacheKey(path, query);
  if (!options.refresh) {
    const cached = readCache<T>(ck);
    if (cached !== null) return cached;
  }

  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: { "api-key": getApiKey() },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Hevy API error ${res.status} for ${path}: ${body}`);
  }

  const data = (await res.json()) as T;
  writeCache(ck, data);
  return data;
}

/** Fetch all pages of a paginated endpoint, returning a flat array of items. */
export async function hevyGetAll<T>(
  path: string,
  itemKey: string,
  pageSize: number = 10,
  options: { refresh?: boolean } = {}
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  while (true) {
    const data = await hevyGet<Record<string, unknown>>(
      path,
      { page, pageSize },
      options
    );
    const items = (data[itemKey] as T[] | undefined) ?? [];
    results.push(...items);

    const pageCount = (data["page_count"] as number | undefined) ?? 1;
    if (page >= pageCount) break;
    page++;
  }

  return results;
}
