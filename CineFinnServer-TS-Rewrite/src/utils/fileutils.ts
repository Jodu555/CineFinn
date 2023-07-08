import fs from 'fs';
import path from 'path';

const listFiles = (lcPath: string) => {
	const files: string[] = [];
	const dirs: string[] = [];
	fs.readdirSync(lcPath)
		.map((e) => {
			return { name: e, path: path.join(lcPath, e) };
		})
		.forEach((entity) => {
			if (fs.statSync(entity.path).isDirectory()) {
				dirs.push(entity.name);
				const revOutput = listFiles(path.join(entity.path));
				files.push(...revOutput.files);
				dirs.push(...revOutput.dirs);
			} else {
				files.push(entity.path);
			}
		});
	return { files, dirs };
};

module.exports = {
	listFiles,
};
