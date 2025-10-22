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

const listFiles = async (rootPath: string, concurrency: number = 20): Promise<{ files: string[], dirs: string[]; }> => {
    const files: string[] = [];
    const dirs: string[] = [];
    const queue: string[] = [rootPath];

    while (queue.length > 0) {
        const currentDir = queue.shift()!;
        const entries = await readdir(currentDir);

        const batch = entries.map(entry => {
            const fullPath = path.join(currentDir, entry);
            return stat(fullPath).then(stats => ({ name: entry, path: fullPath, isDirectory: stats.isDirectory() }));
        });

        const results = await Promise.all(batch);

        for (const result of results) {
            if (result.isDirectory) {
                dirs.push(result.name);
                queue.push(result.path);
            } else {
                files.push(result.path);
            }
        }

        // Control concurrency by processing directories in chunks
        if (queue.length > concurrency) {
            await new Promise(resolve => setImmediate(resolve));
        }
    }

    return { files, dirs };
};


export { listFiles };
