/**
 * Language negotiation is easy to get subtly, permanently wrong: a reader
 * trapped in a language they did not pick, a crawler redirected away from
 * the URL it was asked to index, or a cache serving one reader's redirect to
 * everyone. Each of those is a rule below.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const locales = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr",
    isDefault: true, isActive: true, sortOrder: 0, flagEmoji: null,
    translationMode: "manual_write", provider: null, model: null, glossary: [], id: 1 },
  { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl",
    isDefault: false, isActive: true, sortOrder: 1, flagEmoji: null,
    translationMode: "manual_ai", provider: null, model: null, glossary: [], id: 2 },
];

vi.mock("../services/translation.service", () => ({
  listLocales: vi.fn(async () => locales),
}));

const { localeNegotiationMiddleware } = await import("./localeNegotiation");
const { listLocales } = await import("../services/translation.service");

function run(opts: {
  path?: string; url?: string; method?: string;
  accept?: string; cookie?: string; ua?: string;
}) {
  const res: any = {
    redirected: null as null | { status: number; to: string },
    varied: [] as string[],
    cookies: {} as Record<string, string>,
    vary(h: string) { this.varied.push(h); },
    cookie(n: string, v: string) { this.cookies[n] = v; },
    redirect(status: number, to: string) { this.redirected = { status, to }; },
  };
  const req: any = {
    method: opts.method ?? "GET",
    path: opts.path ?? "/",
    url: opts.url ?? opts.path ?? "/",
    headers: {
      "accept-language": opts.accept,
      cookie: opts.cookie,
      "user-agent": opts.ua ?? "Mozilla/5.0",
    },
  };
  let nexted = false;
  return localeNegotiationMiddleware(req, res, () => { nexted = true; })
    .then(() => ({ res, nexted }));
}

beforeEach(() => {
  (listLocales as any).mockClear();
  (listLocales as any).mockResolvedValue(locales);
});

describe("who gets redirected", () => {
  it("sends an Arabic browser to the Arabic URL", async () => {
    const { res } = await run({ path: "/", accept: "ar,en;q=0.8" });
    expect(res.redirected).toEqual({ status: 302, to: "/ar" });
  });

  it("keeps the path and the query when it redirects", async () => {
    const { res } = await run({
      path: "/construction/big-5-opens", url: "/construction/big-5-opens?utm=x",
      accept: "ar",
    });
    expect(res.redirected?.to).toBe("/ar/construction/big-5-opens?utm=x");
  });

  it("leaves an English browser where it is", async () => {
    const { nexted, res } = await run({ path: "/", accept: "en-GB,en;q=0.9" });
    expect(nexted).toBe(true);
    expect(res.redirected).toBeNull();
  });

  it("leaves a browser asking for a language the site does not publish", async () => {
    const { nexted } = await run({ path: "/", accept: "fr-FR,fr;q=0.9" });
    expect(nexted).toBe(true);
  });
});

describe("the reader's own choice wins", () => {
  it("honours a cookie that says Arabic even with an English browser", async () => {
    const { res } = await run({ path: "/", accept: "en-US", cookie: "bdLang=ar" });
    expect(res.redirected?.to).toBe("/ar");
  });

  it("never overrides a reader who chose English, whatever the browser says", async () => {
    // The escape hatch. Without this, an Arabic-configured browser can never
    // read the English edition — press the switcher, get sent straight back.
    const { nexted, res } = await run({ path: "/", accept: "ar", cookie: "bdLang=en" });
    expect(nexted).toBe(true);
    expect(res.redirected).toBeNull();
  });

  it("remembers a negotiated language so it is decided once, not every request", async () => {
    const { res } = await run({ path: "/", accept: "ar" });
    expect(res.cookies.bdLang).toBe("ar");
  });

  it("does not rewrite a cookie the reader already has", async () => {
    const { res } = await run({ path: "/", accept: "ar", cookie: "bdLang=ar" });
    expect(res.cookies.bdLang).toBeUndefined();
  });
});

describe("URLs that already name a language", () => {
  it("leaves an Arabic URL alone", async () => {
    const { nexted } = await run({ path: "/ar/construction/big-5-opens", accept: "ar" });
    expect(nexted).toBe(true);
  });

  it("lets an English reader open an Arabic link — the link chose", async () => {
    const { nexted, res } = await run({
      path: "/ar/construction/big-5-opens", accept: "en-US", cookie: "bdLang=en",
    });
    expect(nexted).toBe(true);
    expect(res.redirected).toBeNull();
  });
});

describe("what must never be redirected", () => {
  it("never redirects a crawler", async () => {
    // Cloaking, and it would stop Google reaching both sides of the hreflang
    // pair it is being asked to honour.
    const { nexted, res } = await run({ path: "/", accept: "ar", ua: "Googlebot/2.1" });
    expect(nexted).toBe(true);
    expect(res.redirected).toBeNull();
  });

  it("never redirects an API call", async () => {
    const { nexted } = await run({ path: "/api/trpc/news.list", accept: "ar" });
    expect(nexted).toBe(true);
  });

  it("never redirects an asset", async () => {
    const { nexted } = await run({ path: "/fonts/stc-forward-regular.woff2", accept: "ar" });
    expect(nexted).toBe(true);
  });

  it("never redirects a POST", async () => {
    const { nexted } = await run({ path: "/", method: "POST", accept: "ar" });
    expect(nexted).toBe(true);
  });

  it("never redirects sign-in", async () => {
    const { nexted } = await run({ path: "/signin", accept: "ar" });
    expect(nexted).toBe(true);
  });
});

describe("caching", () => {
  it("varies on the two headers it read, even when it lets the request through", async () => {
    const { res } = await run({ path: "/", accept: "en-US" });
    expect(res.varied).toContain("Accept-Language");
    expect(res.varied).toContain("Cookie");
  });
});

describe("when the site has one language", () => {
  it("does nothing at all", async () => {
    (listLocales as any).mockResolvedValue([locales[0]]);
    const { nexted, res } = await run({ path: "/", accept: "ar" });
    expect(nexted).toBe(true);
    expect(res.varied).toEqual([]);
  });

  it("serves the page when the locale lookup fails", async () => {
    (listLocales as any).mockRejectedValue(new Error("db down"));
    const { nexted } = await run({ path: "/", accept: "ar" });
    expect(nexted).toBe(true);
  });
});
