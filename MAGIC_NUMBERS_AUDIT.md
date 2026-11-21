# Magic Number Audit — CineFinnV2

This is an AI generated audit of all magic numbers present in the codebase. Based on the Commit Hash #057e75bf
I plan to with time work through some of this audit and move the constants to a `constants.ts` file per project-dir

Scope: all first-party sources under `apps/*/src`, `apps/CineFinnClientNuxt/app`, and `packages/*/src`.
Excluded as generated/vendored: `node_modules/`, `apps/CineFinnClientNuxt/.nuxt/`, `packages/*/dist/`.
No code was modified.

Legend: **🔥 high** = unexplained behavior-defining literal, **⚠️ medium** = unlabelled timing/size/limit,
**· low** = readability nit. Every line is `path:line`.

---

## Already extracted (for reference — NOT findings)

These are already named, so they are not counted as magic numbers:

- `apps/CineFinnServer/src/utils/movingItems.ts:24-37` — `PROGRESS_BROADCAST_THRESHOLD`, `POST_TRANSFER_WAIT_MS`,
  `STREAM_HIGH_WATER_MARK`, `ACK_TIMEOUT_MS`, `FINALIZE_TIMEOUT_MS`, `PULL_IDLE_TIMEOUT_MS`,
  `MAX_RETRY_ATTEMPTS`, `RETRY_BASE_DELAY_MS`, `DB_UPDATE_RETRY_ATTEMPTS`, `PULL_REQUEST_TIMEOUT_MS`
- `apps/CineFinnServer/src/routes/video.ts:167` — `VIDEO_IDLE_TIMEOUT_MS`
- `apps/CineFinnServer/src/routes/image.ts:36` — `CACHE_TIME`
- `apps/CineFinnServer/src/middleware/auth.ts:74` — `HANDSHAKE_INTERVAL_MS`
- `apps/CineFinnServer/src/job/crawler.ts:430` — `CONCURRENCY`
- `apps/CineFinnServer/src/routes/recommendations/recommendations.ts:567` — `TIMEOUT`
- `apps/CineFinnSubSystem/src/transmitFile.ts:14-15` — `PULL_ACK_TIMEOUT_MS`, `PULL_END_TIMEOUT_MS`
- `apps/CineFinnSubSystem/src/index.ts:204` — `MAX_IN_FLIGHT` (function-local)
- `apps/CineFinnPreviewImageGenerator/src/index.ts:32-35` — `MAX_JOB_ATTEMPTS`, `FFMPEG_START_TIMEOUT_MS`,
  `FFMPEG_STALL_TIMEOUT_MS`, `MIN_COMPLETION_PERCENT`
- `apps/CineFinnClientNuxt/app/pages/franchise/[slug].vue:243` — `NAV_SCROLL_STEP`
- `apps/CineFinnClientNuxt/app/pages/watch/[SID].vue:497` — `MAX_SOCKET_TRY_RECONNECT`

---

## apps/CineFinnScraper

### src/utils/compare.ts
- `:75` **🔥** `fs.statSync(filename + '----------')` — appends ten literal dashes to the cache filename.
  No real file can match, so `stats` is always `null` and the "reuse previous download list" branch
  (`:80-86`) is dead code. Looks like a debugging hack left in; the literal dash-run is the smell.
- `:80` **🔥** `lastAlteredFileMin < 50` — reuses the previous `dlList*.json` if it is younger than
  50 minutes; the number is unexplained and undocumented.
- `:115` **⚠️** `promiseLimit<AniWorldSerieCompare>(10)` — local scraping concurrency, duplicated as
  `concurrencyLimit: 10` in `src/client.ts:25` with no shared constant.
- `:145-146` **⚠️** `5 * 60 * 1000` — per-chunk socket scrape timeout (5 min). Message hardcodes
  "5 minutes" as a second copy of the same value.
- `:408` **🔥** `return lst < 4` — Levenshtein distance threshold used to decide whether a scraped movie
  title matches a local movie. Purely magic: no name, no comment, no link to title length.

### src/index.ts
- `:154` and `:225` **⚠️** `timeout: 1000 * 60` — 1-minute axios timeout for index / serie fetches.
- `:253` **⚠️** `Date.now() - 1000 * 60 * 60 * 24 * 30` — 30-day smart-mode lookback. Assigned to
  `thirtyDaysAgo`, but the day count is still an inline literal.

### src/utils/utils.ts
- `:38` **·** `JSON.stringify(list, null, 3)` — 3-space JSON indent, inconsistent with the 2-space used
  in `src/calendars/*.ts`.
- `:41` **⚠️** `timeout = 1000 * 60 * 10` — default `callJob` timeout (10 min) inlined in the signature.

### src/client.ts
- `:25` **⚠️** `concurrencyLimit: 10` — default scraper concurrency (duplicate of compare.ts `:115`).

### src/class/DownloaderConnector.ts
- `:25` **⚠️** `timeout: 1000 * 60 * 15` — 15-minute AniDL request timeout (comment only).

### src/calendars/aniworldCalendar.ts
- `:32` **·** `href.split('/')[3]` — hardcoded URL path segment index for the series slug.
### src/calendars/stoCalendar.ts
- `:26` **·** `href.split('/')[2]` — same idea, different index for STO URLs.

---

## apps/CineFinnSubSystem

### src/index.ts
- `:19` **·** `crypto.randomUUID().replaceAll('-', '')` — no numeric literal, but note the same
  hand-rolled token pattern is repeated in `apps/CineFinnScraper/src/index.ts:23`.
- `:241` **·** `mapObj.data.len / 1024 / 1024` — ad-hoc MB conversion in a log line even though
  `formatBytes()` from `@cinefinn/utilities/bytes` is already imported (`:7`).

### src/routes/video.ts
- `:90` **·** `highWaterMark: 64 * 1024` — 64 KB read chunks (inline comment present).

### src/transmitFile.ts
- `:282` **⚠️** `bandwidth * 1024 * 1024` — MB/s → bytes/s; the "1024²" conversion is repeated verbatim
  in the log lines at `:286`, `:372-373`.

---

## apps/CineFinnPreviewImageGenerator

### src/index.ts
- `:96` **⚠️** `}, 5_000)` — stall-check interval (5 s) inlined while every other FFmpeg timing is a
  named constant right above it.
- `:240` **⚠️** `chunkArray(files, 100)` — upload batch size (100 files per multipart POST).
- `:280` **foo** `bandwidthMBs * 8_000_000` — MB/s → bit/s conversion constant (8 × 10⁶).
- `:284` **🔥** `Math.min(50, Math.max(0.5, readrate))` — read-rate clamps at 50× upper and 0.5× lower,
  both unexplained.
- `:305` **·** `for (let i = 0; i < 5; i++)` — decorative 5 line job-log header.
- `:337` **⚠️** `'-vf fps=1/10,scale=120:-1'` — frame every 10 s, 120 px wide (explained only by the
  comment above the array).
- `:354-355` **⚠️** `removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 }` — BullMQ retention
  counts inlined.
- `:368` **·** `const pad = 20` — CLI info separator width.

---

## packages

### Utilities/src/time.ts
- `:38` **⚠️** `Math.floor(days / 30)` — approximates a month as 30 days (`timeAgo`).
- `:39` **·** `Math.floor(months / 12)` — months per year (self-evident).
### Utilities/src/bytes.ts
- `:11` **·** `iec ? 1024 : 1000` — binary/decimal divider (standard, fine as-is).
### Utilities/src/stream.ts
- `:29` **·** `if (delay > 10)` — 10 ms jitter threshold below which the throttle skips the timer.
### Utilities/src/index.ts
- `:1` **⚠️** `debounce(cb, delay = 1000)` — default 1 s debounce.
### ConfigurationManager/src/index.ts
- `:13`, `:23` **·** `JSON.stringify(..., null, 3)` — 3-space config indent (cosmetic).

---

## apps/CineFinnServer

### src/routes/watch.ts
- `:26` **🔥** `return we.runtime === -1 ? 500 : we.runtime;` — `-1` means "unknown runtime"; `500`
  is a fallback runtime (seconds) with no constant.
- `:30` **🔥** `return 300;` — default average runtime when the series has no entities.
- `:63`, `:236` **·** `}, 1000)` — 1 s delay before re-reading the DB.
- `:302` **·** `let season_IDX = 0` — 0/1-based season index juggling across the file.

### src/routes/index.ts
- `:25-31` **·** language-priority map (`GerSub: 1` … `JapDub: 8`) — ordering is implicit in the integers.
- `:213` **·** `index % 50 == 0` — progress log cadence.
- `:279` **⚠️** `pLimit(5)` — per-request fan-out.
- `:351` **⚠️** `forEachNonBlockingAsync(rows, 20, ...)` — bulk concurrency 20.
- `:433` **⚠️** `timeout(1000 * 60 * 10)` — 10-minute scraper check timeout.


### src/routes/video.ts
- `:62` **⚠️** `5_000` — fallback `videoStats` timeout (message repeats "5s").
- `:134` **·** `highWaterMark: 64 * 1024` — 64 KB chunks (commented).

### src/routes/playlist.ts
- `:12-17` **·** validation bounds `.min(3)`, `.max(64)`, `.max(256)`, `.min(4)`, `.max(50)` — inline schema
  limits.

### src/sockets/client.socket.ts
- `:129` **⚠️** `2000` — debounce window for `updateTime` socket events.
- `:158` **·** `Math.floor(Math.random() * 10 ** 5)` — 5-digit RMVC session id space.

### src/sockets/scraper.socket.ts
- `:141` **⚠️** `scraperSocket.timeout(5000)` — calendar fetch timeout.

### src/job/crawler.ts
- `:31` **⚠️** `new CacheContext('crawler-series', 500)` — cache entry cap.
- `:62` **⚠️** `1000 * 60 * 5` — 5-minute interval.
- `:744` **⚠️** `pLimit(5)` — scrape fan-out.
- `:766` **⚠️** `1000 * 60 * 1` — 1-minute interval.

### src/job/Job.ts
- `:122` **⚠️** `}, 800)` — 800 ms delay between job queue polls.

### src/job/images.ts
- `:38` **·** `i % 5000 == 0` — progress log cadence; also logs `watchableEntities.length + 1`
  (the `+1` has no explanation).
- `:59` **⚠️** comment says "Around 15% to 20% deviation should be okay" but no constant follows it.
- `:91` **·** `slice(0, 50)` — `first50` preview slice.
- `:99` **⚠️** `forEachNonBlockingAsync(queuedJobs, 2, ...)` — image job concurrency 2.

### src/LRUCache.ts
- `:107`, `:260` **⚠️** `ttl: number = 60 * 60 * 1000` — default 1-hour TTL for every cache.
- `:285` **⚠️** `new CacheContext('users', 50)` — user cache capacity.

### src/fileutils.ts
- `:64` **⚠️** `concurrency: number = 20` — directory walk fan-out.
- `:113` **⚠️** `truncate(sanitized, 255)` — 255-byte filename cap (filesystem limit, unexplained).

### src/utils/movingItems.ts  (mostly extracted — only leftovers)
- `:23` **·** `process.env.MOVING_ITEM_TICK ?? "5000"` — env default as a string literal.
- `:247`, `:408` **⚠️** `RETRY_BASE_DELAY_MS * 2 ** (attempt - 2)` — base 2 and the `- 2` offset encode the
  backoff shape with no name.
- `:507` **·** `setMaxListeners(5000)` — listener cap.
- `:512`, `:600`, `:627`, `:642`, `:782`, `:828` **⚠️** `120_000`, `* 1000 * 3`, `ACK_TIMEOUT_MS * 2`,
  `toFixed(2)`, `1024 * 1024` — 2-minute transfer floor, 3× safety factor, doubled ack window and
  MB/percent formatting all inlined.

### src/utils/EmailManager.ts
- `:46`, `:51` **⚠️** `setTimeout(..., 1000 * 60 * 5)` — 5-minute retry backoff.
- `:60` **⚠️** `1000 * 60 * 5` — 5-minute stall-check cadence.

### src/utils/imageTransform.ts
Mostly documented via JSDoc defaults (`q ?? 80` `:401`, `compressionLevel ?? 6` `:407`,
`maxSlope ?? 3` `:345`, `blur(3)` `:351`, `median >= 3` `:373`) — acceptable, but the validation bounds
(`1-99`, `0.3–1000`, `1-255`) are only in prose and not enforceable constants.

### src/utils/commands.ts
- `:64` **·** `{ client: 0, subsystem: 1, scraper: 2, default: 0 }` — priority map; integers have implicit
  meaning.

---

## apps/CineFinnClientNuxt (frontend)

### Behavior-defining literals
- `app/pages/watch/[SID].vue:493` **⚠️** `2000` — debounce for watch-time sync (mirrors the server's
  `client.socket.ts:129`, duplicated instead of shared).
- `app/pages/watch/[SID].vue:891`, `:915` **🔥** `watchHistory.watchTime >= 500` — "finished" fallback when
  `totalRuntime === -1`; unexplained 500 s threshold, duplicated in both branches.
- `app/pages/watch/[SID].vue:714-733` **⚠️** keep-state `setInterval`/`setTimeout` delays are inline.
- `app/pages/watch/[SID].vue:1106-1110` **·** `rgba(255,255,255,0.08/0.6)` — ad-hoc alpha values (design tokens would help).
- `app/composables/useSocket.ts:37` **⚠️** `reconnectionDelayMax: 5 * 1000` — 5 s socket backoff cap.
- `app/composables/useSocket.ts:12` **·** `.slice(2, 15)` — 13-char random socket id.
- `app/composables/useAuthCookie.ts:1` **·** `60 * 60 * 24 * 30 * 2` — 2-month auth cookie (comment present).
- `app/composables/useSeriesImage.ts:15` **·** `.../300/400` — placeholder image dimensions.
- `app/stores/index.store.ts:284,296` **·** `timer: 3000/2000` — toast auto-dismiss; same `3000` repeated at
  `app/stores/todo.store.ts:145,182,211` and `app/plugins/sweetalert2.ts:9`.
- `app/stores/todo.store.ts:55` **·** `10 ** 6` — local todo id space.
- `app/stores/managment.store.ts:17-20` **🔥** `minimumRole: 2/3` — role levels duplicated from the backend
  `Role` enum (same issue as `routes/managment.ts`).
- `app/utils/todo.ts:228` **·** `Math.min(100, ...)` — percentage clamp.
- `app/utils/utils.ts:8-10` **·** `switch (role) { case 2: ... case 3: }` — raw role levels again.
- `app/pages/index.vue:275-322` **⚠️** carousel `transition: 800/400` and breakpoint maps
  `450/520/600/680/780/900/990/2000/2080/2500/3150/3550` with fractional `itemsToShow` (1.4/6.5/…).
- `app/pages/index.vue:449` **·** `min-height: 300px`; `:584-591`, `:768-776` **·** `width: 230px/306px`,
  `height: 250px` — repeated card sizes.

### CSS/design values (grouped finding, not individually listed)
All 52 `.vue` files contain raw `px`, `rgba()`, `rem`, `z-index` and timing values in `<style>` blocks
(e.g. `index.vue` alone has dozens: `255,255,255,0.x` alphas, `306px` cards, `300px` min-height).
They are magic numbers in the strict sense but are better solved with CSS custom properties/design tokens
than per-line constants. They are called out here as a category instead of listed line-by-line.
