require('dotenv').config();
const options = {};
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

//Info: if there are -- then a value is expected if there is only one it is a bool value

const data = require(`./job_${options.name}.js`);

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
