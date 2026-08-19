export const WIKI_HOST = "thefitness.wiki";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Validate and parse a URL, asserting it is an on-wiki thefitness.wiki page. */
export function assertWikiUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (parsed.hostname !== WIKI_HOST && !parsed.hostname.endsWith("." + WIKI_HOST)) {
    throw new Error(
      `Only thefitness.wiki pages can be auto-imported. ` +
        `"${parsed.hostname}" is an off-site link — view it manually and describe the routine to me.`
    );
  }
  return parsed;
}

/** Fetch raw HTML from a thefitness.wiki page. */
export async function fetchWikiHtml(url: string): Promise<string> {
  assertWikiUrl(url);
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Wiki fetch failed ${res.status} for ${url}`);
  }
  return res.text();
}
