import fs from 'fs';
import { Hono } from "hono";
import { assertInsideEntry, getPtoken } from "../utils/utils.js";
import { parseHttpRange } from '@cinefinn/utilities/range';

const router = new Hono()
    .all('/', (c) => {
        const debug = false;

        const ptoken = c.req.header('ptoken') || c.req.query('ptoken');
        debug && console.log('Got request with ptoken:', ptoken);
        if (ptoken == undefined) {
            debug && console.log('No ptoken provided');
            return c.json({ message: 'No ptoken provided' }, 400);
        }
        if (ptoken !== getPtoken()) {
            debug && console.log('Wrong ptoken provided');
            return c.json({ message: 'Wrong ptoken provided' }, 400);
        }

        const filePath = c.req.query('videoPath');
        if (filePath == undefined) {
            debug && console.log('No videoPath provided');
            return c.json({ message: 'No videoPath provided' }, 400);
        }
        debug && console.log('Got videoPath:', filePath);
        const containment = assertInsideEntry(filePath);
        debug && console.log('Path containment:', containment.ok ? 'ok' : containment.error);
        if (!containment.ok) {
            return c.json({ message: containment.error }, 400);
        }
        // Everything below works against the validated resolved path so a
        // TOCTOU / normalization difference can never smuggle a different file
        // past the containment check.
        const resolvedPath = containment.resolved;

        if (!fs.existsSync(resolvedPath)) {
            debug && console.log('Video file not found');
            return c.json({ message: 'Video file not found' }, 404);
        }

        const stat = fs.statSync(resolvedPath);
        debug && console.log('Got fileSize', stat.size);
        const fileSize = stat.size;
        const range = c.req.header('Range');

        // Decode range BEFORE the HEAD handling so HEAD mirrors GET exactly:
        // unfulfillable -> 416 for both methods, an applied range -> 206 and
        // Content-Range for both, no/unsupported range -> plain 200.
        const parsedRange = parseHttpRange(range || undefined, fileSize);
        if (parsedRange.state === 'invalid') {
            debug && console.log('Unfulfillable Range header:', range);
            c.header('Content-Range', `bytes */${fileSize}`);
            return c.body(null, 416);
        }
        const start = parsedRange.state === 'applied' ? parsedRange.start : 0;
        const end = parsedRange.state === 'applied' ? parsedRange.end : fileSize - 1;
        const contentLength = end - start + 1;
        const rangeApplied = parsedRange.state === 'applied';
        debug && console.log('Range:', { start, end, contentLength, fileSize, rangeApplied });

        // Handle HEAD with the same range semantics as GET
        if (c.req.method === 'HEAD') {
            c.header('Accept-Ranges', 'bytes');
            c.header('Content-Length', contentLength.toString());
            c.header('Content-Type', 'video/mp4');
            // Video URLs carry auth tokens in the query and files can be
            // replaced or moved without a URL change — don't cache.
            c.header('Cache-Control', 'no-store');
            if (rangeApplied) {
                c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            }
            return c.body(null, rangeApplied ? 206 : 200);
        }

        if (fileSize <= 0) {
            // An empty file has a degenerate range; serving an empty 200 is
            // safer than letting createReadStream(end:-1) throw a 500.
            c.header('Content-Type', 'video/mp4');
            c.header('Accept-Ranges', 'bytes');
            c.header('Content-Length', '0');
            c.header('Cache-Control', 'no-store');
            return c.body(null, 200);
        }

        // Create file stream
        const fileStream = fs.createReadStream(resolvedPath, {
            start,
            end,
            highWaterMark: 64 * 1024 // 64KB chunks
        });

        // Set status code first
        c.status(rangeApplied ? 206 : 200);

        // Set headers
        c.header('Content-Type', 'video/mp4');
        c.header('Accept-Ranges', 'bytes');
        c.header('Content-Length', contentLength.toString());
        c.header('Cache-Control', 'no-store');

        if (rangeApplied) {
            c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        }

        // Return the file stream as body
        return c.body(fileStream as any);
    });

export { router as videoRouter };
