# Remaining 71 TypeScript Errors (for Claude to fix)

All errors are non-blocking (dev server runs fine). The codebase uses **Drizzle ORM with MySQL/TiDB** where tinyint columns return `number` not `boolean`, and timestamp columns return `string` not `Date`. The most common fix pattern is casting `.values(x)` or `.set(x)` to `as any`.

---

## Pattern 1: TS2769 — `.values()` / `.set()` overload mismatch (most common)

These all need the argument cast to `as any`. Example fix:
```ts
// Before:
await db.insert(table).values(inputObj);
// After:
await db.insert(table).values(inputObj as any);
```

**Files and lines:**
```
server/modules/companies/companies.router.ts(259,25): error TS2769
server/modules/companies/companies.router.ts(262,25): error TS2769
server/modules/companies/companies.router.ts(824,25): error TS2769
server/modules/events/events.router.ts(154,25): error TS2769
server/modules/events/events.router.ts(157,25): error TS2769
server/modules/events/events.router.ts(177,25): error TS2769
server/modules/investors/investors.router.ts(141,25): error TS2769
server/modules/investors/investors.router.ts(306,25): error TS2769
server/modules/investors/investors.router.ts(711,25): error TS2769
server/modules/jobs/jobApplications.router.ts(451,11): error TS2769
server/modules/jobs/jobApplications.router.ts(469,11): error TS2769
server/modules/jobs/jobs.router.ts(259,25): error TS2769
server/modules/jobs/jobs.router.ts(262,25): error TS2769
server/modules/jobs/jobs.router.ts(467,25): error TS2769
server/modules/jobs/jobs.router.ts(994,25): error TS2769
server/modules/news/news.router.ts(149,25): error TS2769
server/modules/news/news.router.ts(152,25): error TS2769
server/modules/news/news.router.ts(1372,11): error TS2769
server/modules/people/people.router.ts(131,25): error TS2769
server/modules/people/people.router.ts(316,25): error TS2769
server/modules/people/people.router.ts(752,25): error TS2769
server/modules/resources/resourcesEnhanced.router.ts(175,59): error TS2769
server/modules/resources/resourcesEnhanced.router.ts(483,60): error TS2769
server/modules/userProfile/browsingHistory.router.ts(308,11): error TS2769
server/modules/userProfile/browsingHistory.router.ts(341,11): error TS2769
server/modules/userProfile/emailDigest.router.ts(169,11): error TS2769
server/modules/userProfile/emailDigest.router.ts(189,11): error TS2769
server/services/scheduler.service.ts(83,13): error TS2769
```

---

## Pattern 2: Specific type mismatches

```
server/modules/companies/companies.router.ts(672,9): error TS2554
  → Expected 5-6 arguments, but got 7 in transitionWorkflow() call. Remove the last argument.

server/modules/userProfile/browsingHistory.router.ts(160,75): error TS18046
  → 'v' is of type 'unknown' in a reduce/map callback. Add explicit type: (v: any).

server/services/ai/imageSearch.service.ts(284,5): error TS2322
  → Type 'string | undefined' not assignable to 'string'. Add ?? '' or non-null assertion.

server/services/ai/newsAgent.service.ts(982,56): error TS2339
  → Property 'title' does not exist on type '{ item: DiscoveredItem; scoring: ScoringResult }'.
  → Fix: access as item.item.title instead of item.title

server/services/ai/scoringEngine.service.ts(151,26): error TS2802
  → Set<string> can only be iterated with downlevelIteration or ES2015+ target.
  → Fix: replace [...mySet] with Array.from(mySet)

server/services/ai/scoringEngine.service.ts(274,7): error TS2554
  → Expected 1 argument but got 2. Remove the second argument from the function call.

server/services/media.service.ts(285,7): error TS2322
  → Type 'string' not assignable to 'Date'. The DB returns string timestamps.
  → Fix: change the return type annotation from Date to string for that field.

server/services/scheduler.service.ts(173,49): error TS2353
  → 'maxPages' does not exist in the crawlWebsite input type.
  → Fix: cast the options object as any: crawlWebsite({ ...opts } as any)

server/services/searchConsole.service.ts(49,12): error TS1263
  → Declarations with initializers cannot also have definite assignment assertions (!).
  → Fix: remove the ! from the variable declaration (e.g. `let x!: Type = value` → `let x: Type = value`)

server/services/slug.service.ts(260,5): error TS2322
  → isActive is number | null from DB but interface expects boolean | null.
  → Fix: map the result: .map(r => ({ ...r, isActive: r.isActive !== null ? Boolean(r.isActive) : null }))

server/services/technicalSeo.service.ts(790,77): error TS18046 — 'a' is unknown in sort callback
server/services/technicalSeo.service.ts(790,81): error TS18046 — 'b' is unknown in sort callback
server/services/technicalSeo.service.ts(815,261): error TS18046 — 'a' is unknown in sort callback
server/services/technicalSeo.service.ts(815,265): error TS18046 — 'b' is unknown in sort callback
  → Fix all 4: change .sort((a, b) => ...) to .sort((a: any, b: any) => ...)
```

---

## Notes
- All fixes are safe type-level casts — no runtime behaviour changes needed.
- The project uses `drizzle-orm` with MySQL2; tinyint(1) columns are typed as `number` not `boolean` in the schema.
- Do NOT change `tsconfig.json` — the target is already ES2020 so the Set iteration error in scoringEngine is a genuine bug (the Set is not typed as `Iterable`).
