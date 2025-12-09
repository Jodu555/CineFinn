import fs from 'fs';
import { Hono } from "hono";
import { authMiddleware } from "../auth.js";
import { watchableEntitysTable } from "../database.js";
import { streamSSE } from 'hono/streaming';



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
    .get('/:watchableEntityUUID', authMiddleware, async (c) => {
        const user = c.get('credentials').user;
        const watchableEntityUUID = c.req.param('watchableEntityUUID');
        const debug = false;

        try {
            // Find the watchable entity
            const watchableEntity = await watchableEntitysTable.getOne({ UUID: watchableEntityUUID });
            if (!watchableEntity) {
                return c.json({ message: 'Watchable Entity not found' }, 404);
            }

            const filePath = watchableEntity.filePath;
            debug && console.log('Got filePath', filePath);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return c.json({ message: 'Video file not found' }, 404);
            }

            const stat = fs.statSync(filePath);
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

        } catch (error) {
            console.error('Error in video streaming:', error);
            return c.json({ message: 'Internal server error' }, 500);
        }
    });

export { router as videoRouter };