import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// ─── Tuneable thresholds ──────────────────────────────────────────────────────

const CONFIG = {
    // Brightness (0-255 mean of all pixels)
    minBrightness: 45,   // below → too dark  (black screens, fades)
    maxBrightness: 220,  // above → too bright (white flashes, blown-out)

    // Standard deviation of brightness across pixels
    // Low SD → near-solid colour frame (logo card, title card, etc.)
    minStdDev: 18,

    // How many frames to skip at the very start before even trying
    // (cold-opens often begin with dark/noisy frames)
    skipFrames: 0,

    // Prefer a frame that is at least this far into the episode
    // expressed as a fraction of total frames (0–1).
    // Set to 0 to disable.
    // minFractionIn: 0.05,
    minFractionIn: 0,
};

function extractIndex(filename: string) {
    const m = filename.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

/** Compute mean and standard-deviation of a raw pixel buffer (greyscale). */
function stats(buf: Buffer) {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i];
    const mean = sum / buf.length;

    let variance = 0;
    for (let i = 0; i < buf.length; i++) {
        const d = buf[i] - mean;
        variance += d * d;
    }
    return { mean, stdDev: Math.sqrt(variance / buf.length) };
}

/**
 * Returns `null` if the frame is acceptable, or a short reason string
 * if it should be rejected.
 */
async function rejectReason(filePath: string) {
    const { data } = await sharp(filePath)
        .resize(160, 90, { fit: 'fill' })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const { mean, stdDev } = stats(data);

    if (mean < CONFIG.minBrightness) return `too dark (brightness=${mean.toFixed(1)})`;
    if (mean > CONFIG.maxBrightness) return `too bright (brightness=${mean.toFixed(1)})`;
    if (stdDev < CONFIG.minStdDev) return `too uniform (stdDev=${stdDev.toFixed(1)}, likely solid frame)`;

    return null; // We like the frame
}

export async function pickPreviewImage(folder: string) {

    const absFolder = path.resolve(folder);
    if (!fs.existsSync(absFolder)) {
        console.error(`Folder not found: ${absFolder}`);
        return null;
    }

    const allFiles = fs.readdirSync(absFolder).filter(f =>
        /\.(jpe?g|png|webp)$/i.test(f)
    );

    if (allFiles.length === 0) {
        console.error('No image files found in folder.');
        return null;
    }

    // Sort numerically by the index embedded in the filename
    const sorted = allFiles.sort((a, b) => extractIndex(a) - extractIndex(b));

    const total = sorted.length;
    const skipUntil = Math.max(CONFIG.skipFrames, Math.floor(total * CONFIG.minFractionIn));

    console.error(`Found ${total} frames. Skipping first ${skipUntil}, then scanning…`);

    for (let i = 0; i < sorted.length; i++) {
        const filename = sorted[i];
        const filePath = path.join(absFolder, filename);

        if (i < skipUntil) {
            console.error(`  [${i + 1}/${total}] ${filename} → skipped (too early)`);
            continue;
        }

        let reason;
        try {
            reason = await rejectReason(filePath);
        } catch (err: any) {
            console.error(`  [${i + 1}/${total}] ${filename} → error reading file: ${err.message}`);
            continue;
        }

        if (reason) {
            console.error(`  [${i + 1}/${total}] ${filename} → rejected: ${reason}`);
        } else {
            console.error(`  [${i + 1}/${total}] ${filename} → ✓ selected`);
            // Print ONLY the path to stdout so callers can capture it cleanly
            console.log(filePath);
            return filePath;
        }
    }

    // Fallback: nothing passed – return the middle frame
    const fallback = path.join(absFolder, sorted[Math.floor(total / 2)]);
    console.error(`No ideal frame found - falling back to middle frame.`);
    console.log(fallback);
    return fallback;
}

// Run when called directly
// pickPreviewImage(process.argv[2]);