import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// const listFiles = (lcPath: string) => {
// 	const files: string[] = [];
// 	const dirs: string[] = [];
// 	fs.readdirSync(lcPath)
// 		.map((e) => {
// 			return { name: e, path: path.join(lcPath, e) };
// 		})
// 		.forEach((entity) => {
// 			if (fs.statSync(entity.path).isDirectory()) {
// 				dirs.push(entity.name);
// 				const revOutput = listFiles(path.join(entity.path));
// 				files.push(...revOutput.files);
// 				dirs.push(...revOutput.dirs);
// 			} else {
// 				files.push(entity.path);
// 			}
// 		});
// 	return { files, dirs };
// };

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// const listFiles = async (rootPath: string, concurrency: number = 20): Promise<{ files: string[], dirs: string[]; }> => {
//     const files: string[] = [];
//     const dirs: string[] = [];
//     const queue: string[] = [rootPath];

//     while (queue.length > 0) {
//         const currentDir = queue.shift()!;
//         const entries = await readdir(currentDir);

//         const batch = entries.map(entry => {
//             const fullPath = path.join(currentDir, entry);
//             return stat(fullPath).then(stats => ({ name: entry, path: fullPath, isDirectory: stats.isDirectory() }));
//         });

//         const results = await Promise.all(batch);

//         for (const result of results) {
//             if (result.isDirectory) {
//                 dirs.push(result.name);
//                 queue.push(result.path);
//             } else {
//                 files.push(result.path);
//             }
//         }

//         // Control concurrency by processing directories in chunks
//         if (queue.length > concurrency) {
//             await new Promise(resolve => setImmediate(resolve));
//         }
//     }

//     return { files, dirs };
// };

const listFiles = async (
    rootPath: string,
    concurrency: number = 20
): Promise<{ files: string[]; dirs: string[] }> => {
    const files: string[] = [];
    const dirs: string[] = [];
    const queue: string[] = [rootPath];

    const processDir = async (dirPath: string): Promise<void> => {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                dirs.push(entry.name);
                queue.push(fullPath);
            } else {
                files.push(fullPath);
            }
        }
    };

    while (queue.length > 0) {
        const batch = queue.splice(0, concurrency);

        await Promise.all(batch.map(processDir));

        // This is needed to prevent the event loop from blocking otherwise we lose the socket connections for example
        await new Promise(resolve => setImmediate(resolve));
    }

    return { files, dirs };
};

const illegalRe = /[\/\?<>\\:\*\|":]/g;
const controlRe = /[\x00-\x1f\x80-\x9f]/g;
const reservedRe = /^\.+$/;
const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

function truncate(sanitized: string, length: number): string {
    const uint8Array = new TextEncoder().encode(sanitized)
    const truncated = uint8Array.slice(0, length)
    return new TextDecoder().decode(truncated)
}

function sanitizeFileName(input: string, replacement = '') {
    const sanitized = input
        .replace(illegalRe, replacement)
        .replace(controlRe, replacement)
        .replace(reservedRe, replacement)
        .replace(windowsReservedRe, replacement);
    return truncate(sanitized, 255);
}


export { listFiles, sanitizeFileName };
