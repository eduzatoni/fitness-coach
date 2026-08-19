export interface ParsedWikiExercise {
  rawName: string;
  sets: number;
  reps: number;
  isAmrap: boolean;
}

export interface ParsedWikiRoutine {
  title: string;
  exercises: ParsedWikiExercise[];
  notes: string[];
}

// &#215; / &#xD7; / &times; / plain x or X
const SCHEME_RE = /^\s*(\d+)\s*(?:×|x)\s*(\d+(?:-\d+)?)\s*(\+?)\s+(.+?)\s*$/i;

const LI_RE = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const TAG_RE = /<[^>]+>/g;
const DECIMAL_ENTITY_RE = /&#(\d+);/g;
const HEX_ENTITY_RE = /&#x([0-9a-fA-F]+);/g;

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&times;": "×",
  "&rsquo;": "'",
  "&#8217;": "'",
  "&lsquo;": "'",
  "&#8216;": "'",
  "&ndash;": "–",
  "&#8211;": "–",
  "&mdash;": "—",
  "&#8212;": "—",
};

function decodeEntities(s: string): string {
  let out = s;
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    out = out.split(entity).join(char);
  }
  out = out.replace(DECIMAL_ENTITY_RE, (_, code) => String.fromCodePoint(Number(code)));
  out = out.replace(HEX_ENTITY_RE, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  return out;
}

function stripTags(s: string): string {
  return s.replace(TAG_RE, "");
}

function extractTitle(html: string, url?: string): string {
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1?.[1]) {
    const t = decodeEntities(stripTags(h1[1])).trim();
    if (t) return t;
  }
  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleTag?.[1]) {
    const raw = decodeEntities(stripTags(titleTag[1])).trim();
    // Strip " - Site Name" or " | Site Name" suffix
    const t = raw.split(/\s+[-|]\s+/)[0]?.trim();
    if (t) return t;
  }
  if (url) {
    try {
      const segments = new URL(url).pathname.replace(/\/$/, "").split("/").filter(Boolean);
      const slug = segments[segments.length - 1];
      if (slug) return slug.replace(/-/g, " ");
    } catch {
      // ignore
    }
  }
  return "Imported Routine";
}

export function parseWikiRoutine(html: string, url?: string): ParsedWikiRoutine {
  if (!html || !html.trim()) {
    return { title: extractTitle("", url), exercises: [], notes: [] };
  }

  const title = extractTitle(html, url);

  // Collect all <li> inner texts in document order
  const items: string[] = [];
  let m: RegExpExecArray | null;
  LI_RE.lastIndex = 0;
  while ((m = LI_RE.exec(html)) !== null) {
    const inner = m[1] ?? "";
    const text = decodeEntities(stripTags(inner)).trim();
    if (text) items.push(text);
  }

  const exercises: ParsedWikiExercise[] = [];
  const noteItems: { idx: number; text: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const text = items[i] ?? "";
    const match = SCHEME_RE.exec(text);
    if (match) {
      const setsStr = match[1] ?? "0";
      const repsStr = match[2] ?? "0";
      const plusStr = match[3] ?? "";
      const name = match[4] ?? "";
      const sets = parseInt(setsStr, 10);
      // For rep ranges like "8-12", use the lower bound
      const reps = parseInt(repsStr.split("-")[0] ?? "0", 10);
      const isAmrap = plusStr === "+";
      exercises.push({ rawName: name, sets, reps, isAmrap });
    } else {
      noteItems.push({ idx: i, text });
    }
  }

  // Only keep notes adjacent to the exercise block
  let notes: string[] = [];
  if (exercises.length > 0) {
    const allItems = items;
    // Find index range of exercise <li>s in the original items array
    let firstExIdx = Infinity;
    let lastExIdx = -Infinity;
    for (let i = 0; i < allItems.length; i++) {
      if (SCHEME_RE.test(allItems[i] ?? "")) {
        if (i < firstExIdx) firstExIdx = i;
        if (i > lastExIdx) lastExIdx = i;
      }
    }
    const windowStart = firstExIdx;
    const windowEnd = lastExIdx + 3;
    notes = noteItems
      .filter((n) => n.idx >= windowStart && n.idx <= windowEnd)
      .map((n) => n.text);
  }

  return { title, exercises, notes };
}
