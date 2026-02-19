import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getConfig } from './config.js';
import { getSocket } from './utils/utils.js';
import type { ErrorData } from '@cinefinn/types/socket';

const socket = getSocket();


interface DownloadSession {
    stream: fs.WriteStream;
    hash: crypto.Hash;
    expectedMD5: string;
    bytesReceived: number;
    totalSize: number;
    expectedPath: string;
}

let currentDownload: DownloadSession | null = null;

export function setupTransmitFile() {

    socket.on('file_start', (data) => {
        console.log(`Receiving file: ${data.filename} (${data.size} bytes)`);
        const downloadPath = `${path.join(getConfig().entrypoint, data.resultPath)}`;
        console.log(`Download Path: ${downloadPath}`);
        const downloadStream = fs.createWriteStream(downloadPath);
        const downloadHash = crypto.createHash('md5');

        currentDownload = {
            stream: downloadStream,
            hash: downloadHash,
            expectedMD5: data.md5,
            bytesReceived: 0,
            totalSize: data.size,
            expectedPath: downloadPath,
        };

        downloadStream.on('drain', () => {
            socket.emit('ack');
        });
    });

    socket.on('file_chunk', (chunk: Buffer) => {
        if (!currentDownload) {
            console.error('Received chunk but no active download session');
            return;
        }

        const canWrite = currentDownload.stream.write(chunk);
        currentDownload.hash.update(chunk);
        currentDownload.bytesReceived += chunk.length;

        // Log progress
        // const progress = (
        //     (currentDownload.bytesReceived / currentDownload.totalSize) *
        //     100
        // ).toFixed(2);
        // console.log(`Download progress: ${progress}%`);

        if (canWrite) {
            socket.emit('ack');
        }
        // If canWrite is false, we'll emit ack on 'drain' event
    });

    socket.on('file_end', async (callback) => {
        if (!currentDownload) {
            console.error('Received file_end but no active download session');
            return;
        }

        const session = currentDownload;
        session.stream.end();

        await new Promise<void>((resolve) =>
            session.stream.once('finish', resolve)
        );

        const calculatedMD5 = session.hash.digest('hex');
        const isValid = calculatedMD5 === session.expectedMD5;

        console.log(`Download complete!`);
        console.log(`Expected MD5: ${session.expectedMD5}`);
        console.log(`Calculated MD5: ${calculatedMD5}`);
        console.log(`File integrity: ${isValid ? 'VALID' : 'CORRUPTED'}`);
        console.log(`Total bytes received: ${session.bytesReceived}`);
        callback(isValid ? session.expectedPath : false);

        currentDownload = null;
    });

    socket.on('file_error', (data: ErrorData) => {
        console.error('File transfer error:', data.message);
        currentDownload = null;
    });
}