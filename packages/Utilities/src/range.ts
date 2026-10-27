export type ParsedHttpRange =
    | { state: "none" }
    | { state: "invalid" }
    | { state: "applied"; start: number; end: number };

/**
 * Strict `Range` header parser shared by every video route.
 *
 * Behavior contract for callers:
 *  - "none"    : there is no usable Range header (absent, wrong delimiter
 *                prefix or an unsupported unit like "items=0-9"). The response
 *                must be a plain 200 with the full file.
 *  - "invalid" : a `bytes=` range exists but cannot be fulfilled (unfulfillable
 *                bounds, multi-range, trailing garbage). The caller must answer
 *                416 with a `Content-Range: bytes *-by-total` style header.
 *  - "applied" : a single byte range resolved to start/end (inclusive), already
 *                clamped to the file size. The caller answers 206 plus a
 *                `Content-Range` header covering start..end of total.
 *
 * Only `/^\d+$/` values are accepted — `parseInt` alone would let `bytes=0-5abc`
 * through as 0-5.
 */
export function parseHttpRange(range: string | undefined | null, fileSize: number): ParsedHttpRange {
    const bytesPrefix = "bytes=";
    // Unsupported units and absent headers are treated identically: no range.
    if (!range || !range.startsWith(bytesPrefix)) {
        return { state: "none" };
    }

    // An empty file has no meaningful byte range at all.
    if (fileSize <= 0) {
        return { state: "invalid" };
    }

    const bytesRange = range.slice(bytesPrefix.length);

    // Multi-range (`bytes=0-1,5-9`) is unsupported — refuse instead of silently
    // dropping the second interval.
    if (bytesRange.includes(",")) {
        return { state: "invalid" };
    }

    const parts = bytesRange.split("-");
    if (parts.length !== 2) {
        return { state: "invalid" };
    }

    const startRaw = (parts[0] ?? "").trim();
    const endRaw = (parts[1] ?? "").trim();

    if (startRaw === "" && endRaw === "") {
        return { state: "invalid" };
    }
    // Strict digits only: blocks "5-2x", "1_0", " 5 " + garbage, etc.
    if (startRaw !== "" && !/^\d+$/.test(startRaw)) {
        return { state: "invalid" };
    }
    if (endRaw !== "" && !/^\d+$/.test(endRaw)) {
        return { state: "invalid" };
    }

    let start = 0;
    let end = fileSize - 1;

    if (startRaw === "") {
        // Suffix range: `bytes=-N` means the last N bytes.
        const suffix = parseInt(endRaw, 10);
        if (suffix <= 0) {
            return { state: "invalid" };
        }
        start = Math.max(0, fileSize - suffix);
    } else {
        start = parseInt(startRaw, 10);
        if (endRaw !== "") {
            end = parseInt(endRaw, 10);
        }
    }

    // Unfulfillable ranges must be rejected so the client can fall back.
    if (start > end || start > fileSize - 1) {
        return { state: "invalid" };
    }

    end = Math.min(end, fileSize - 1);

    return { state: "applied", start, end };
}
