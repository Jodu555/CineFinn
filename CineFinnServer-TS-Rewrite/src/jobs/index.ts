import dotenv from 'dotenv';
dotenv.config();

const options: any = {};
let waitFor = null;
process.argv.forEach((args) => {
	if (args.startsWith('--')) {
		waitFor = args.split('--')[1];
		return;
	}

	if (args.startsWith('-')) {
		options[args.split('-')[1]] = true;
		return;
	}

	if (waitFor != null) {
		options[waitFor] = args;
		waitFor = null;
	}
});

interface JobObject {
	help: {
		description: string;
		options: string[];
	};
	run: (options: Record<string, string | number | boolean>) => Promise<void>;
}

//Info: if there are -- then a value is expected if there is only one it is a bool value

// const data = require(`./job_${options.name}.js`);
const data: JobObject = require(`./job_${options.name}.ts`);

let valid = true;
data.help.options.forEach((opt) => {
	if (!options[opt]) {
		valid = false;
	}
});

if (valid) {
	data.run(options);
} else {
	console.log('Missing arguments!', data.help.options);
}
