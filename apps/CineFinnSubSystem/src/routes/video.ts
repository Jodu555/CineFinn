import fs from 'fs';
import { Hono } from "hono";
import { getConfig } from "../config.js";
import { getPtoken } from "../utils/utils.js";

function decodeRangeHeader(range: string, fileSize: number) {
    const bytesPrefix = 'bytes=';
    if (!range || !range.startsWith(bytesPrefix)) {
        return { start: 0, end: fileSize - 1 };
    }

    const bytesRange = range.substring(bytesPrefix.length);
    const parts = bytesRange.split('-');

    let start = 0;
    let end = fileSize - 1;

    if (parts.length === 2) {
        const rangeStart = parts[0]?.trim();
        const rangeEnd = parts[1]?.trim();

        if (rangeStart) {
            start = parseInt(rangeStart, 10);
        }

        if (rangeEnd) {
            end = parseInt(rangeEnd, 10);
        } else if (rangeStart) {
            // If only start is provided, go to end of file
            end = fileSize - 1;
        }
    }

    // Ensure valid range
    start = Math.max(0, start);
    end = Math.min(fileSize - 1, end);

    return { start, end };
}

const router = new Hono()
    .all('/', (c) => {
        const debug = true;

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
        if (!filePath.startsWith(getConfig().entrypoint)) {
            debug && console.log('videoPath is not in the entrypoint');
            return c.json({ message: 'videoPath is not in the entrypoint' }, 400);
        }


        if (!fs.existsSync(filePath)) {
            debug && console.log('Video file not found');
            return c.json({ message: 'Video file not found' }, 404);
        }

        const stat = fs.statSync(filePath);
        debug && console.log('Got fileSize', stat.size);
        const fileSize = stat.size;
        const range = c.req.header('Range');

        // Handle HEAD requests
        if (c.req.method === 'HEAD') {
            c.header('Accept-Ranges', 'bytes');
            c.header('Content-Length', fileSize.toString());
            c.header('Content-Type', 'video/mp4');
            return c.body(null, 200);
        }

        // Decode range header
        const { start, end } = decodeRangeHeader(range || '', fileSize);
        const contentLength = end - start + 1;

        debug && console.log('Range:', { start, end, contentLength, fileSize });

        // Create file stream
        const fileStream = fs.createReadStream(filePath, {
            start,
            end,
            highWaterMark: 64 * 1024 // 64KB chunks
        });

        // Set status code first
        c.status(range ? 206 : 200);

        // Set headers
        c.header('Content-Type', 'video/mp4');
        c.header('Accept-Ranges', 'bytes');
        c.header('Content-Length', contentLength.toString());

        if (range) {
            c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        }

        // Return the file stream as body
        return c.body(fileStream as any);
    });

export { router as videoRouter };