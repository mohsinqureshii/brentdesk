import { publication } from "../../shared/publication";
/**
 * Event Image Sourcing — Wikimedia Commons
 * ----------------------------------------------------------------------
 * Finds a REAL photograph for an event: a genuinely free-licensed image
 * of the venue, or failing that of the host city, from Wikimedia
 * Commons. No API key, no scraping, no generated gradients.
 *
 * Design rules:
 *   - NON-FATAL. Every network/parse failure resolves to `null`. The
 *     caller keeps its existing image (or the designed gradient
 *     fallback) and simply tries again later. Nothing here throws.
 *   - DEFENSIVE PARSING. The Commons response is read field by field
 *     with every access guarded: a renamed, missing or oddly-typed
 *     field drops that one candidate, never the whole run.
 *   - ATTRIBUTION TRAVELS WITH THE URL. Most Commons licences require
 *     credit, so the artist, licence and description page come back
 *     alongside the image and are stored next to it.
 *   - DETERMINISTIC. The same event always resolves to the same photo,
 *     but two events in the same city get different ones (see
 *     `pickDeterministic`).
 *   - POLITE. Requests are strictly sequential and rate-limited
 *     globally; Commons is a donated resource, never parallel-hammered.
 *
 * API shape (documented at https://commons.wikimedia.org/w/api.php):
 *   query.pages[pageid] = {
 *     title, imageinfo: [{ thumburl, url, descriptionurl, width, height,
 *                          extmetadata: { Artist, Credit, LicenseShortName, ... } }]
 *   }
 */

/** What the caller needs to store. */
export interface SourcedEventImage {
  /** 1600px-wide render of the original — never the multi-MB original. */
  url: string;
  /** Human-readable attribution line, e.g. "Jane Doe". */
  credit: string | null;
  /** Short licence name, e.g. "CC BY-SA 4.0". */
  license: string | null;
  /** Commons file description page, for the "source" link. */
  sourcePage: string | null;
}

/**
 * The subset of an event row this service reads. Deliberately loose so
 * a partial `select()` or a plain object both work.
 */
export interface SourceableEvent {
  slug?: string | null;
  title?: string | null;
  city?: string | null;
  country?: string | null;
  venue?: string | null;
  venueName?: string | null;
  type?: string | null;
  format?: string | null;
}

const COMMONS_ENDPOINT = "https://commons.wikimedia.org/w/api.php";

/**
 * Wikimedia requires a descriptive User-Agent identifying the client
 * and a contact address; anonymous/browser-like agents are blocked.
 */
const USER_AGENT = publication.bots.imageSearch;

/** Per-request network budget. */
const REQUEST_TIMEOUT_MS = 12_000;

/** Minimum gap between two Commons requests, process-wide. */
const MIN_REQUEST_GAP_MS = 250;

/** Smallest acceptable original width — hero images render up to 1600px. */
const MIN_WIDTH = 1200;

/** How many candidate queries we are willing to spend on one event. */
const MAX_QUERIES_PER_EVENT = 4;

// ---------------------------------------------------------------------
// Query construction
// ---------------------------------------------------------------------

/**
 * Landmark terms for the cities this desk actually covers. A curated
 * term beats a generic one by a wide margin: "Riyadh" alone returns
 * street signs and maps, "King Abdullah Financial District" returns the
 * skyline everyone recognises.
 */
const CITY_LANDMARKS: Record<string, string[]> = {
  riyadh: ["Riyadh skyline", "King Abdullah Financial District Riyadh"],
  jeddah: ["Jeddah waterfront", "Jeddah Corniche"],
  dammam: ["Dammam Corniche", "Dammam skyline"],
  khobar: ["Khobar Corniche", "Al Khobar skyline"],
  "al khobar": ["Khobar Corniche", "Al Khobar skyline"],
  dhahran: ["Dhahran Ithra", "King Abdulaziz Center for World Culture"],
  mecca: ["Mecca skyline"],
  makkah: ["Mecca skyline"],
  medina: ["Medina skyline"],
  madinah: ["Medina skyline"],
  neom: ["NEOM Saudi Arabia", "Tabuk Province landscape"],
  tabuk: ["Tabuk Saudi Arabia"],
  alula: ["AlUla Saudi Arabia", "Hegra AlUla"],
  "al ula": ["AlUla Saudi Arabia", "Hegra AlUla"],
  abha: ["Abha Saudi Arabia"],
  dubai: ["Dubai World Trade Centre", "Dubai skyline"],
  "abu dhabi": ["Abu Dhabi skyline", "Abu Dhabi Corniche"],
  sharjah: ["Sharjah skyline"],
  doha: ["Doha skyline", "Doha Corniche"],
  manama: ["Manama skyline"],
  "kuwait city": ["Kuwait City skyline"],
  muscat: ["Muscat Oman"],
  cairo: ["Cairo skyline"],
  amman: ["Amman Jordan skyline"],
};

/**
 * A term appropriate to the *kind* of event, appended to the city when
 * we have no curated landmark. Conferences want a hall, a hackathon
 * wants a room full of laptops, everything else wants the skyline.
 */
function typeTerm(type?: string | null): string {
  switch ((type || "").toLowerCase()) {
    case "conference":
    case "summit":
      return "convention centre";
    case "workshop":
    case "hackathon":
    case "meetup":
      return "conference hall";
    case "webinar":
      return "skyline";
    default:
      return "skyline";
  }
}

function clean(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/**
 * Search queries for one event, most specific first.
 *
 * The event TITLE is never searched on its own: "LEAP 2026" or "Biban
 * Forum 2026" match nothing on Commons, and the few things they do
 * match are logos and posters rather than photography. Place is what
 * Commons is actually rich in, so place is what we ask for.
 */
export function buildImageQueries(event: SourceableEvent): string[] {
  const queries: string[] = [];
  const push = (q: string) => {
    const v = clean(q);
    if (v.length < 3) return;
    if (queries.some(existing => existing.toLowerCase() === v.toLowerCase())) return;
    queries.push(v);
  };

  const venue = clean(event.venueName) || clean(event.venue);
  const city = clean(event.city);
  const country = clean(event.country);

  // 1. The venue itself — the best possible answer when Commons has it.
  if (venue) push(venue);

  // 2. City + a term that suits the event, curated where we have one.
  if (city) {
    for (const landmark of CITY_LANDMARKS[city.toLowerCase()] ?? []) push(landmark);
    push(`${city} ${typeTerm(event.type)}`);
  }

  // 3. City alone, then city + country as the last broad net.
  if (city) {
    push(city);
    if (country) push(`${city} ${country}`);
  }

  return queries.slice(0, MAX_QUERIES_PER_EVENT);
}

// ---------------------------------------------------------------------
// Candidate filtering
// ---------------------------------------------------------------------

/** Real photographs only. SVG/TIF renders and PDFs are not photography. */
const PHOTO_EXTENSION_RE = /\.(jpe?g|png)$/i;

/**
 * Commons namespace 6 is full of maps, charts, coats of arms and logos
 * that are technically photographs' neighbours but ruin an event card.
 * Matched against the file title with word boundaries so "Ramapo" or
 * "Flagstaff" don't get caught by "map"/"flag".
 */
const REJECT_TITLE_RES: RegExp[] = [
  /\bmaps?\b/i,
  /\blogos?\b/i,
  /coat of arms/i,
  /\bflags?\b/i,
  /\bdiagrams?\b/i,
  /\bcharts?\b/i,
  /\bseal\b/i,
  /\bemblem\b/i,
  /\bicon\b/i,
];

interface Candidate {
  title: string;
  url: string;
  sourcePage: string | null;
  credit: string | null;
  license: string | null;
}

/** Extension test runs on the ORIGINAL file name, never the thumbnail:
 *  Commons renders an .svg map to a .png thumb, which would otherwise
 *  sail straight through the filter. */
function looksLikePhoto(title: string, originalUrl: string): boolean {
  const name = title.replace(/^File:/i, "");
  if (!PHOTO_EXTENSION_RE.test(name) && !PHOTO_EXTENSION_RE.test(stripQuery(originalUrl))) {
    return false;
  }
  return !REJECT_TITLE_RES.some(re => re.test(name));
}

function stripQuery(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

/** `extmetadata` values are HTML fragments — links, spans, the lot. */
function stripHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function metaValue(extmetadata: any, key: string): string {
  const entry = extmetadata?.[key];
  if (!entry) return "";
  // Documented shape is { value, source }; tolerate a bare string too.
  const raw = typeof entry === "string" ? entry : entry?.value;
  return stripHtml(raw);
}

function truncate(value: string, max: number): string | null {
  const v = value.trim();
  if (!v) return null;
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
}

/**
 * Turn one `query.pages` entry into a usable candidate, or null.
 * Every field access is optional-chained: Commons occasionally omits
 * `imageinfo` entirely (deleted/redirected files) and has renamed
 * extmetadata keys before.
 */
function toCandidate(page: any): Candidate | null {
  const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : undefined;
  if (!info) return null;

  // Prefer the 1600px render; fall back to the original only if the API
  // declined to make a thumbnail (rare, but it happens for huge files).
  const url = typeof info.thumburl === "string" && info.thumburl
    ? info.thumburl
    : typeof info.url === "string"
      ? info.url
      : "";
  const originalUrl = typeof info.url === "string" ? info.url : url;
  if (!url.startsWith("https://")) return null;

  const width = Number(info.width ?? info.thumbwidth);
  const height = Number(info.height ?? info.thumbheight);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= height) return null;          // landscape only — cards are 16:9
  if (width < MIN_WIDTH) return null;        // too small to be a hero

  const title = typeof page.title === "string" ? page.title : "";
  if (!looksLikePhoto(title, originalUrl)) return null;

  const ext = page.extmetadata ?? info.extmetadata;
  const artist = metaValue(ext, "Artist") || metaValue(ext, "Credit");
  const license = metaValue(ext, "LicenseShortName") || metaValue(ext, "License");

  return {
    title,
    url,
    sourcePage: typeof info.descriptionurl === "string" ? info.descriptionurl : null,
    credit: truncate(artist, 512),
    license: truncate(license, 128),
  };
}

// ---------------------------------------------------------------------
// Deterministic variety
// ---------------------------------------------------------------------

/**
 * FNV-1a — the same hash the client uses to pick an event's gradient
 * (see client/src/components/events/EventVisual.tsx). Small, fast and
 * stable across engines, which is the whole point: the value must not
 * drift between runs or between Node versions.
 */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Pick one candidate by slug hash rather than always taking the first
 * result. Two Riyadh events therefore land on different skylines, while
 * a given event resolves to the same photo on every re-run — so a
 * re-source doesn't silently reshuffle the whole events index.
 */
export function pickDeterministic<T>(items: T[], seed: string): T | null {
  if (!items.length) return null;
  return items[hashString(seed || "event") % items.length];
}

// ---------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------

let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Process-wide throttle: never two Commons hits inside MIN_REQUEST_GAP_MS. */
async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

function buildSearchUrl(query: string): string {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "1",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size",
    iiurlwidth: "1600",
    origin: "*",
  });
  return `${COMMONS_ENDPOINT}?${params.toString()}`;
}

/**
 * One Commons search. Returns [] for ANY problem — offline, blocked
 * egress, 429, HTML error page, renamed fields. Callers treat an empty
 * list and a failed request identically, which is what makes the whole
 * service non-fatal.
 */
async function searchCommons(query: string): Promise<Candidate[]> {
  await throttle();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(buildSearchUrl(query), {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        "Api-User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[EventImages] Commons returned ${res.status} for "${query}"`);
      return [];
    }

    const body: any = await res.json().catch(() => null);
    if (!body || typeof body !== "object") return [];
    if (body.error) {
      console.warn(`[EventImages] Commons API error for "${query}":`, body.error?.code ?? "unknown");
      return [];
    }

    // formatversion=1 gives an object keyed by pageid; formatversion=2
    // gives an array. Accept either so a default change can't break us.
    const pages = body?.query?.pages;
    const list: any[] = Array.isArray(pages)
      ? pages
      : pages && typeof pages === "object"
        ? Object.values(pages)
        : [];

    const candidates: Candidate[] = [];
    for (const page of list) {
      try {
        const candidate = toCandidate(page);
        if (candidate) candidates.push(candidate);
      } catch {
        // A single malformed page never sinks the query.
      }
    }
    // Stable order: Commons returns pages in hash order, which would
    // make the deterministic pick non-deterministic across runs.
    candidates.sort((a, b) => a.title.localeCompare(b.title));
    return candidates;
  } catch (err) {
    console.warn(
      `[EventImages] Commons request failed for "${query}": ${(err as Error)?.message ?? err}`,
    );
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

/**
 * Find a real, free-licensed photograph for an event.
 *
 * Tries each query in `buildImageQueries` in order and stops at the
 * first that yields usable candidates, so a venue photo always beats a
 * generic city shot. Returns `null` when nothing suitable is found or
 * Commons is unreachable — never throws.
 */
export async function resolveEventImage(
  event: SourceableEvent,
): Promise<SourcedEventImage | null> {
  try {
    const queries = buildImageQueries(event);
    if (!queries.length) return null;

    const seed = clean(event.slug) || clean(event.title) || "event";

    for (const query of queries) {
      const candidates = await searchCommons(query);
      if (!candidates.length) continue;

      // Salt the seed with the query so an event that falls through to
      // a broader query doesn't land on the same index every time.
      const chosen = pickDeterministic(candidates, `${seed}::${query}`);
      if (!chosen) continue;

      return {
        url: chosen.url,
        credit: chosen.credit,
        license: chosen.license,
        sourcePage: chosen.sourcePage,
      };
    }
    return null;
  } catch (err) {
    console.warn(
      `[EventImages] resolveEventImage failed for "${event?.slug ?? "?"}": ${(err as Error)?.message ?? err}`,
    );
    return null;
  }
}
