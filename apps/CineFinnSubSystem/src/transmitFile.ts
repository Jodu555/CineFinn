import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getConfig } from './config.js';
import { getSocket } from './utils/utils.js';
import type { ErrorData } from '@cinefinn/types/socket';
import { pipeline, Transform } from 'stream';
import { promisify } from 'util';
import { ThrottleStream } from '@cinefinn/utilities/stream';

const pipelineAsync = promisify(pipeline);

interface DownloadSession {
    stream: fs.WriteStream;
    hash: crypto.Hash;
    bytesReceived: number;
    totalSize: number;
    expectedPath: string;
}


export function setupTransmitFile() {
    const socket = getSocket();
    let currentDownload: DownloadSession | null = null;

    socket.on('file_start', (data) => {
        console.log(`Receiving file: ${data.filename} (${data.size} bytes)`);
        const downloadPath = `${path.join(getConfig().entrypoint, data.resultPath)}`;
        console.log(`Download Path: ${downloadPath}`);
        const downloadStream = fs.createWriteStream(downloadPath);
        const downloadHash = crypto.createHash('md5');

        currentDownload = {
            stream: downloadStream,
            hash: downloadHash,
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

    socket.on('file_end', async (md5, callback) => {
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
        const isValid = calculatedMD5 === md5;

        console.log(`Download complete!`);
        console.log(`Expected MD5: ${md5}`);
        console.log(`Calculated MD5: ${calculatedMD5}`);
        console.log(`File integrity: ${isValid ? 'VALID' : 'CORRUPTED'}`);
        console.log(`Total bytes received: ${session.bytesReceived}`);
        callback(isValid ? session.expectedPath : false);

        currentDownload = null;
    });

    socket.on('file_error', (data: ErrorData) => {
        console.error('File transfer error:', data.message);
        currentDownload?.stream.destroy();
        currentDownload?.hash.destroy();
        currentDownload = null;
    });

    socket.on(
        "pull_request",
        async (data: { filePath: string; bandwidth: number }) => {
            const { filePath, bandwidth } = data;

            if (!fs.existsSync(filePath)) {
                console.error(`[Transfer] pull_request — file not found: ${filePath}`);
                socket.emit("pull_file_error", { message: `File not found: ${filePath}` });
                return;
            }

            const stats = fs.statSync(filePath);
            const fileSize = stats.size;
            const md5Hash = crypto.createHash("md5");
            const bandwidthBytes = bandwidth * 1024 * 1024;

            console.log(
                `[Transfer] pull_request — sending ${filePath} ` +
                `(${(fileSize / (1024 * 1024)).toFixed(2)} MB) at ${bandwidth} MB/s`
            );

            socket.emit("pull_file_start", { size: fileSize });

            const readStream = fs.createReadStream(filePath);
            const throttle = new ThrottleStream(bandwidthBytes);

            let bytesSent = 0;
            let ackPending = false;

            const waitForAck = (): Promise<void> =>
                new Promise((resolve) => {
                    if (!ackPending) return resolve();
                    socket.once("pull_ack", () => {
                        ackPending = false;
                        resolve();
                    });
                });

            // Also handle acks that arrive between chunk sends
            socket.on("pull_ack", () => { ackPending = false; });

            throttle.on("data", async (chunk: Buffer) => {
                readStream.pause();
                await waitForAck();

                ackPending = true;
                md5Hash.update(chunk);
                socket.emit("pull_file_chunk", chunk);

                bytesSent += chunk.length;
                const progress = ((bytesSent / fileSize) * 100).toFixed(1);
                console.log(
                    `[Transfer] Sent ${(bytesSent / (1024 * 1024)).toFixed(2)} MB / ` +
                    `${(fileSize / (1024 * 1024)).toFixed(2)} MB (${progress}%)`
                );

                readStream.resume();
            });

            readStream.on("error", (err) => {
                console.error(`[Transfer] ReadStream error: ${err.message}`);
                readStream.destroy();
                throttle.destroy();
                socket.emit("pull_file_error", { message: err.message });
            });

            throttle.on("error", (err) => {
                console.error(`[Transfer] Throttle error: ${err.message}`);
                readStream.destroy();
                throttle.destroy();
                socket.emit("pull_file_error", { message: err.message });
            });

            await pipelineAsync(readStream, throttle);

            const md5 = md5Hash.digest("hex");
            console.log(`[Transfer] MD5: ${md5}`);

            const accepted = await new Promise<string | false>((resolve) => {
                socket.emit("pull_file_end", md5, (result: string | false) => resolve(result));
            });

            if (accepted === false) {
                // Main rejected — don't delete, main will retry with a new pull_request
                console.error("[Transfer] Main server rejected file (MD5 mismatch) — keeping local copy for retry");
            } else {
                console.log(`[Transfer] Accepted by main at: ${accepted} — removing local copy`);
                fs.rmSync(filePath, { recursive: true });
            }
        }
    );
}