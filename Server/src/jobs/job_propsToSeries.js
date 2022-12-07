const fs = require('fs');

module.exports = {
	//This job i wrote cause aproximately it happens over and over that i tweak the series object definition
	help: {
		description:
			'This recieves an input file with a list of series and converts it into the new series model and saves it to the output file based on the model file which describes the new series object',
		options: ['model', 'input', 'output'],
	},
	run: (options) => {
		// console.log(options);
		const model = JSON.parse(fs.readFileSync(options.model));
		console.log('Loaded the model');
		let series = JSON.parse(fs.readFileSync(options.input));
		console.log('Loaded the input');

		series = series.map((serie) => {
			return { ...model, ...serie };
		});
		console.log('Concatenated');

		fs.writeFileSync(options.output, JSON.stringify(series, null, 3));
		console.log('Saved to output');
	},
};
