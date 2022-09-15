const commandLineArgs = require('command-line-args');
const optionDefinitions = [
    { name: 'name', alias: 'n', type: String },
    { name: 'from', alias: 'f', type: Number },
    { name: 'to', alias: 't', type: Number },
];
const options = commandLineArgs(optionDefinitions);

console.log(options);