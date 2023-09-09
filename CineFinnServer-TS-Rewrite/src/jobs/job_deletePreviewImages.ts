import path from 'path';
import fs from 'fs';
import { getSeries } from '../utils/utils';

interface JobObject {
	help: {
		description: string;
		options: string[];
	};
	run: (options: Record<string, string | number | boolean>) => Promise<void>;
}

export = {
	help: {
		description: 'This job deletes all generated PreviewImages but no covers or landings',
		options: [],
	},
	run: async (options) => {
		const series = getSeries();

		const paths: string[] = [];

		for (const serie of series) {
			const previewImagesPath = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), 'previewImages');
			if (fs.existsSync(previewImagesPath)) {
				paths.push(previewImagesPath);
			}
		}

		for (const path of paths) {
			console.log('Deleting', path);
			fs.rmSync(path, { recursive: true, force: true });
		}
	},
} as JobObject;
