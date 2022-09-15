const commandLineArgs = require('command-line-args');
const optionDefinitions = [
    { name: 'name', alias: 'n', type: String },
];
const options = commandLineArgs(optionDefinitions);
require(`./job_${options.name}.js`);

