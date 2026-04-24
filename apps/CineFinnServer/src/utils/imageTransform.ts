import sharp, { type Sharp, type FitEnum, type Blend } from "sharp";

export interface TransformParams {
    // Source
    url: string;

    // Resize
    /** Output width in px */
    w?: number;
    /** Output height in px */
    h?: number;
    /**
     * How the image is fitted into the target dimensions.
     * cover | contain | fill | inside | outside
     * Default: cover
     */
    fit?: "cover" | "contain" | "fill" | "inside" | "outside";
    /** Hex background color used when fit=contain (e.g. ffffff) */
    bg?: string;
    /**
     * Focal point for cover/crop gravity.
     * centre | north | northeast | east | southeast | south | southwest | west | northwest | entropy | attention
     */
    gravity?: string;

    // Crop / Extract
    /** Extract region: left,top,width,height  e.g. crop=10,20,300,200 */
    crop?: string;

    // Trim
    /**
     * Trim boring edges.
     * true  → default threshold (10)
     * number → custom threshold 1-99
     */
    trim?: string;

    // Extend / Padding
    /**
     * Add padding: top,right,bottom,left  (CSS shorthand order)
     * e.g. extend=20,10,20,10
     * Uses bg colour if set.
     */
    extend?: string;

    // Rotation / Flipping
    /** Rotate degrees clockwise. auto → EXIF auto-rotate */
    rotate?: string;
    /** Flip vertically (true) */
    flip?: string;
    /** Flop horizontally (true) */
    flop?: string;

    // Format & Quality
    /**
     * Output format.
     * jpeg | png | webp | avif | tiff | gif
     */
    format?: "jpeg" | "png" | "webp" | "avif" | "tiff" | "gif";
    /** Compression quality 1-100 (jpeg/webp/avif). Default 80 */
    q?: number;
    /** PNG compression level 0-9. Default 6 */
    compressionLevel?: number;

    // Colour Adjustments
    /**
     * Brightness multiplier (modulate).
     * 1.0 = original, 0.5 = half, 2.0 = double
     */
    brightness?: number;
    /**
     * Saturation multiplier (modulate).
     * 0 = greyscale, 1 = original, 2 = double saturation
     */
    saturation?: number;
    /**
     * Hue rotation degrees (modulate).
     * e.g. 90, 180, -90
     */
    hue?: number;
    /**
     * Lightness multiplier (modulate).
     * 1.0 = original
     */
    lightness?: number;

    // Gamma
    /** Gamma value 1.0-3.0. Default 2.2 */
    gamma?: number;

    // Tint
    /** Hex colour to tint the image, e.g. ff6600 */
    tint?: string;

    // Blur / Sharpen / Median
    /** Gaussian blur sigma 0.3–1000. true → sigma 3 */
    blur?: string;
    /**
     * Sharpen.
     * true → mild unsharp mask
     * sigma:flat:jagged  e.g. sharpen=2:1:2
     */
    sharpen?: string;
    /** Median filter size (odd integer ≥ 3). Removes noise/dust. */
    median?: number;

    // Greyscale / Negate / Normalize / Threshold
    /** Convert to greyscale (true) */
    grayscale?: string;
    /**
     * Negate colours.
     * true → negate all channels
     * alpha → also negate alpha
     */
    negate?: string;
    /**
     * Normalize contrast (stretch histogram).
     * true → full normalize
     * lower:upper  e.g. normalize=1:99
     */
    normalize?: string;
    /**
     * Threshold to create binary image.
     * 1-255  e.g. threshold=128
     */
    threshold?: number;

    // Clahe (Local contrast)
    /**
     * CLAHE – Contrast Limiting Adaptive Histogram Equalization.
     * width:height:maxSlope  e.g. clahe=8:8:3
     */
    clahe?: string;

    // Linear
    /**
     * Apply linear level adjustment (a·x + b).
     * a:b  e.g. linear=1.2:0
     */
    linear?: string;

    // Recomb
    /**
     * Apply colour recombination matrix (3×3, row-major, comma-separated).
     * e.g. sepia recomb=0.393,0.769,0.189,0.349,0.686,0.168,0.272,0.534,0.131
     */
    recomb?: string;

    // Composite / Watermark
    /**
     * URL of an overlay image to composite on top.
     * Pair with overlayGravity / overlayBlend.
     */
    overlay?: string;
    /** Sharp gravity for overlay. Default: southeast */
    overlayGravity?: string;
    /**
     * Blend mode for overlay.
     * over | multiply | screen | add | … (Sharp blend modes)
     * Default: over
     */
    overlayBlend?: string;
    /** Tile the overlay across the whole image (true) */
    overlayTile?: string;

    // Metadata
    /** Strip EXIF/ICC metadata (true, default). Set false to keep. */
    strip?: string;
}

/** Fetch a remote image and return its raw buffer */
async function fetchImage(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status} ${res.statusText} — ${url}`);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
}

/** Parse a CSS-shorthand-style number list from a comma-separated string. Eg. "1,2,3,4" */
function nums(s: string): number[] {
    return s.split(",").map((v) => {
        const n = Number(v.trim());
        if (!Number.isFinite(n)) throw new Error(`Invalid number in "${s}"`);
        return n;
    });
}

/**
 * Build and execute the full Sharp pipeline based on the provided params.
 * Returns the processed image buffer and its content-type.
 */
export async function processImage(
    params: TransformParams
): Promise<{ buffer: Buffer; contentType: string }> {
    const sourceBuffer = await fetchImage(params.url);
    let pipeline: Sharp = sharp(sourceBuffer);

    // Auto-rotate from EXIF by default (can be skipped by rotate=0)
    if (params.rotate === "auto" || params.rotate === undefined) {
        pipeline = pipeline.rotate(); // uses EXIF orientation
    }

    // Explicit rotation
    if (params.rotate && params.rotate !== "auto") {
        const deg = Number(params.rotate);
        if (!Number.isFinite(deg)) throw new Error("rotate must be a number or 'auto'");
        const bgColor = params.bg ? `#${params.bg}` : "#000000";
        pipeline = pipeline.rotate(deg, { background: bgColor });
    }

    // Flip / Flop
    if (params.flip === "true" || params.flip === "1") pipeline = pipeline.flip();
    if (params.flop === "true" || params.flop === "1") pipeline = pipeline.flop();

    // Trim
    if (params.trim !== undefined) {
        if (params.trim === "true" || params.trim === "1") {
            pipeline = pipeline.trim();
        } else {
            const threshold = Number(params.trim);
            if (!Number.isFinite(threshold)) throw new Error("trim must be true or a number 1-99");
            pipeline = pipeline.trim({ threshold });
        }
    }

    // Resize
    if (params.w !== undefined || params.h !== undefined) {
        const bgColor = params.bg ? `#${params.bg}` : "#ffffff";
        pipeline = pipeline.resize({
            width: params.w,
            height: params.h,
            fit: (params.fit as keyof FitEnum) ?? "cover",
            position: params.gravity ?? "centre",
            background: bgColor,
            withoutEnlargement: false,
        });
    }

    // Crop / Extract
    if (params.crop) {
        const parts = nums(params.crop);
        if (parts.length !== 4) throw new Error("crop must be left,top,width,height for width and height, -1 will be replaces with the image width and height");
        let [left, top, width, height] = parts;
        if (width === -1) {
            width = (await pipeline.metadata()).width;
        }
        if (height === -1) {
            height = (await pipeline.metadata()).height;
        }
        pipeline = pipeline.extract({ left, top, width, height });
    }

    // Extend / Padding
    if (params.extend) {
        const parts = nums(params.extend);
        if (parts.length !== 4 && parts.length !== 1)
            throw new Error("extend must be top,right,bottom,left or a single value");
        const [top, right, bottom, left] =
            parts.length === 1 ? [parts[0], parts[0], parts[0], parts[0]] : parts;
        const bgColor = params.bg ? `#${params.bg}` : "#ffffff";
        pipeline = pipeline.extend({ top, right, bottom, left, background: bgColor });
    }

    // Greyscale
    if (params.grayscale === "true" || params.grayscale === "1") {
        pipeline = pipeline.grayscale();
    }

    // Negate
    if (params.negate !== undefined) {
        const alpha = params.negate === "alpha";
        pipeline = pipeline.negate({ alpha });
    }

    // Colour modulate (brightness / saturation / hue / lightness)
    const hasModulate =
        params.brightness !== undefined ||
        params.saturation !== undefined ||
        params.hue !== undefined ||
        params.lightness !== undefined;

    if (hasModulate) {
        pipeline = pipeline.modulate({
            brightness: params.brightness,
            saturation: params.saturation,
            hue: params.hue,
            lightness: params.lightness,
        });
    }

    // Tint
    if (params.tint) {
        pipeline = pipeline.tint(`#${params.tint}`);
    }

    // Gamma
    if (params.gamma !== undefined) {
        pipeline = pipeline.gamma(params.gamma);
    }

    // Linear adjustment
    if (params.linear) {
        const [a, b] = params.linear.split(":").map(Number);
        if (!Number.isFinite(a) || !Number.isFinite(b))
            throw new Error("linear must be a:b e.g. linear=1.2:0");
        pipeline = pipeline.linear(a, b);
    }

    // Recomb matrix
    if (params.recomb) {
        const flat = nums(params.recomb);
        if (flat.length !== 9) throw new Error("recomb must have exactly 9 comma-separated values");
        const matrix: [number, number, number][] = [
            [flat[0], flat[1], flat[2]],
            [flat[3], flat[4], flat[5]],
            [flat[6], flat[7], flat[8]],
        ];
        pipeline = pipeline.recomb(matrix as any);
    }

    // Normalize
    if (params.normalize !== undefined) {
        if (params.normalize === "true" || params.normalize === "1") {
            pipeline = pipeline.normalize();
        } else {
            const [lower, upper] = params.normalize.split(":").map(Number);
            if (!Number.isFinite(lower) || !Number.isFinite(upper))
                throw new Error("normalize must be true or lower:upper e.g. normalize=1:99");
            pipeline = pipeline.normalize({ lower, upper });
        }
    }

    // Threshold
    if (params.threshold !== undefined) {
        pipeline = pipeline.threshold(params.threshold);
    }

    // CLAHE
    if (params.clahe) {
        const [width, height, maxSlope] = params.clahe.split(":").map(Number);
        if (!Number.isFinite(width) || !Number.isFinite(height))
            throw new Error("clahe must be width:height[:maxSlope]");
        pipeline = pipeline.clahe({ width, height, maxSlope: maxSlope ?? 3 });
    }

    // Blur
    if (params.blur !== undefined) {
        if (params.blur === "true" || params.blur === "1") {
            pipeline = pipeline.blur(3);
        } else {
            const sigma = Number(params.blur);
            if (!Number.isFinite(sigma) || sigma < 0.3 || sigma > 1000)
                throw new Error("blur must be true or a sigma value between 0.3 and 1000");
            pipeline = pipeline.blur(sigma);
        }
    }

    // Sharpen
    if (params.sharpen !== undefined) {
        if (params.sharpen === "true" || params.sharpen === "1") {
            pipeline = pipeline.sharpen();
        } else {
            const [sigma, flat, jagged] = params.sharpen.split(":").map(Number);
            if (!Number.isFinite(sigma)) throw new Error("sharpen must be true or sigma[:flat:jagged]");
            pipeline = pipeline.sharpen({ sigma, m1: flat, m2: jagged });
        }
    }

    // Median
    if (params.median !== undefined) {
        if (params.median < 3 || params.median % 2 === 0)
            throw new Error("median must be an odd integer ≥ 3");
        pipeline = pipeline.median(params.median);
    }

    // Composite overlay
    if (params.overlay) {
        const overlayBuffer = await fetchImage(params.overlay);
        pipeline = pipeline.composite([
            {
                input: overlayBuffer,
                gravity: (params.overlayGravity as any) ?? "southeast",
                blend: (params.overlayBlend as Blend) ?? "over",
                tile: params.overlayTile === "true" || params.overlayTile === "1",
            },
        ]);
    }

    // Metadata strip
    // Strip by default; pass strip=false to keep metadata by default improves security i guess
    if (params.strip !== "false" && params.strip !== "0") {
        pipeline = pipeline.withMetadata({});
    } else {
        pipeline = pipeline.withMetadata();
    }

    // Output formats
    const fmt = params.format;
    const quality = params.q ?? 80;

    let contentType = "image/jpeg";

    if (fmt === "png") {
        contentType = "image/png";
        pipeline = pipeline.png({ compressionLevel: params.compressionLevel ?? 6 });
    } else if (fmt === "webp") {
        contentType = "image/webp";
        pipeline = pipeline.webp({ quality });
    } else if (fmt === "avif") {
        contentType = "image/avif";
        pipeline = pipeline.avif({ quality });
    } else if (fmt === "tiff") {
        contentType = "image/tiff";
        pipeline = pipeline.tiff({ quality });
    } else if (fmt === "gif") {
        contentType = "image/gif";
        pipeline = pipeline.gif();
    } else {
        // Default: jpeg
        pipeline = pipeline.jpeg({ quality });
    }

    const buffer = await pipeline.toBuffer();
    return { buffer, contentType };
}

// Utility Functions for Parser

function num(v: string | undefined): number | undefined {
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

function bool(v: string | undefined): boolean {
    return v === "true" || v === "1" || v === "";
}

export function parseParams(q: Record<string, string>): TransformParams {
    if (!q.url) throw new Error("Missing required query parameter: url");

    return {
        url: q.url,

        // Resize
        w: num(q.w),
        h: num(q.h),
        fit: (q.fit as TransformParams["fit"]) ?? undefined,
        bg: q.bg,
        gravity: q.gravity,

        // Crop / extend / trim
        crop: q.crop,
        trim: q.trim,
        extend: q.extend,

        // Rotation
        rotate: q.rotate,
        flip: q.flip,
        flop: q.flop,

        // Format
        format: (q.format as TransformParams["format"]) ?? undefined,
        q: num(q.q),
        compressionLevel: num(q.compressionLevel),

        // Colour
        brightness: num(q.brightness),
        saturation: num(q.saturation),
        hue: num(q.hue),
        lightness: num(q.lightness),
        gamma: num(q.gamma),
        tint: q.tint,

        // Filters
        blur: q.blur,
        sharpen: q.sharpen,
        median: num(q.median),

        // Adjustments
        grayscale: q.grayscale,
        negate: q.negate,
        normalize: q.normalize,
        threshold: num(q.threshold),
        clahe: q.clahe,
        linear: q.linear,
        recomb: q.recomb,

        // Overlay
        overlay: q.overlay,
        overlayGravity: q.overlayGravity,
        overlayBlend: q.overlayBlend,
        overlayTile: q.overlayTile,

        // Meta
        strip: q.strip,
    };
}

export function buildCacheKey(params: TransformParams): string {
    const sorted = Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
    return `img:${sorted}`;
}