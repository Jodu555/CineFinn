import path from 'path';
import fs from 'fs';

export function setupConfigurationManagment<CI extends { version: string }>(defaultConfig: CI, cliOptions: string[][]): CI {
	const cfgPath = path.join('.', 'config.json');
	if (!fs.existsSync(cfgPath)) {
		fs.writeFileSync(cfgPath, JSON.stringify(defaultConfig, null, 3));
		console.error('Config file not found, creating default config...');
		process.exit(1);
	}
	const cliParsedConfig = parse(cliOptions) as Partial<CI>;

	const loadedConfig: CI = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
	if (loadedConfig?.version !== defaultConfig?.version) {
		console.error('Config version mismatch! It could be that your config is outdated. Exiting...');
		process.exit(1);
	}

	const res = mergeDeep(defaultConfig, mergeDeep(loadedConfig, cliParsedConfig)) as CI;
	return res;
}

function parse(options: string[][]) {
	const obj = {};

	let cArg: string = undefined;
	process.argv.forEach((arg) => {
		if (arg.startsWith('-') || arg.startsWith('--')) {
			arg = arg.replace('-', '');
			if (arg.startsWith('-')) arg = arg.replace('-', '');
			cArg = arg;
		} else {
			if (cArg != undefined) {
				const argArr = options.find((x) => x.find((y) => y == cArg));
				if (argArr != undefined) {
					if (argArr[0].includes('-')) {
						setParseNestedProperty(obj, argArr[0], arg);
					} else {
						obj[argArr[0]] = arg;
						cArg = undefined;
					}
				} else {
					console.log('Unsupported Argument!', cArg);
				}
			}
		}
	});
	return obj;
}

function setParseNestedProperty(obj: object, arg: string, value: string) {
	//I DONT ackchually know why this is necessary but at this point I am too afraid to ask!!!!!!!!!!!!!!!!! PLZ SEND
	arg += '-D';
	const parts = arg.split('-');
	for (let i = 0; i < parts.length; i++) {
		const current = parts[i];
		const prev = parts.slice(0, i);
		if (prev.length == 0) {
			obj[current] = obj[current] ?? {};
		}
		let ref: object;
		for (let j = 0; j < prev.length; j++) {
			const e = prev[j];
			if (ref == undefined) {
				ref = obj[e];
			} else {
				if (i == parts.length - 1 && j == prev.length - 1) {
					ref[e] = value;
				} else {
					ref[e] = ref[e] ?? {};
					ref = ref[e];
				}
			}
		}
	}

	return obj;
}

function isObject(item: object | []) {
	return item && typeof item === 'object' && !Array.isArray(item);
}

function mergeDeep(target: object, source: object) {
	let output = Object.assign({}, target);
	if (isObject(target) && isObject(source)) {
		Object.keys(source).forEach((key) => {
			if (isObject(source[key])) {
				if (!(key in target)) Object.assign(output, { [key]: source[key] });
				else output[key] = mergeDeep(target[key], source[key]);
			} else {
				Object.assign(output, { [key]: source[key] });
			}
		});
	}
	return output;
}
